import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { processUrl } from "../utils/phase1_app.js";
import { info, debug, silent } from "../utils/logger.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import AdmZip from "adm-zip";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const RATING_THRESHOLD = 0.4;

export const postPackage = async (req, res) => {
  try {
    // Extract token from the Authorization header (Bearer <token>)
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing Authorization header."
        );
    }

    const token = authHeader.split(" ")[1]; // Extract token part
    if (!token) {
      // console.log("Token format is incorrect. Use 'Bearer <token>");
      debug("Token format is incorrect. Use 'Bearer <token>");
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing Authorization header.'"
        );
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = (decoded as jwt.JwtPayload).name;

    let { Name, Version, JSProgram, Content, URL } = req.body;
    // console.log(Name);

    // Validate the request body
    if (!Name || !Version || (!Content && !URL)) {
      debug("Missing field(s) in the PackageData or it is formed improperly.");
      // log the exact missing field(s) for debugging
      debug("Name:" + Name);
      debug("Version:" + Version);
      // debug("Content:" + Content);
      return res
        .status(400)
        .send(
          "There are missing field(s) in the PackageData or it is formed improperly (e.g., both Content and URL are set)."
        );
    }

    // Generate a package ID based on the name and version (using SHA-256 hash for uniqueness)
    const packageID = crypto
      .createHash("sha256")
      .update(`${Name}-${Version}`)
      .digest("hex");

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // Check if registry.json exists locally, if not, create one
    let registry: { [key: string]: any[] } = {};
    let packageExists = false;
    if (fs.existsSync("./registry.json")) {
      // Load the existing JSON object from the file
      const fileContent = fs.readFileSync("./registry.json", "utf8");
      registry = JSON.parse(fileContent); // Parse the JSON content into an object
    }
    // console.log("Registry: ", registry);

    // Check if a field exists within a specific heading in the JSON object
    const nameField = registry[Name];
    if (nameField) {
      if (nameField.find((entry) => entry.Version === Version)) {
        // console.log("Package already exists in registry.");
        return res.status(409).send("Package already exists in registry.");
      }
      packageExists = true; // Used to create name field if does not already exist
    }

    const timeUploaded = new Date().toISOString();

    // create metadata object for response
    const metadata = {
      Name,
      Version,
      ID: packageID,
      JSProgram: JSProgram,
      Score: {},
      Cost: -1,
      TimeUploaded: timeUploaded,
      UsernameUploaded: username,
    };

    // Upload the package content or ingest from URL
    const packageKey = `${packageID}`;
    if (Content) {
      // Check base64 length before uploading
      if (!Content || Content.trim().length === 0) {
        return res.status(400).send("Content is missing or empty.");
      }

      // Generate Metric Score
      const repoURL = await extractRepoURL(Content);
      // console.log(repoURL);
      try {
        const rating = await processUrl(repoURL);
        // console.log("rating: ", rating);

        if (rating.NetScore <= RATING_THRESHOLD) {
          // console.log(
          //   "Package is not uploaded due to the disqualified rating."
          // );
          return res
            .status(424)
            .send("Package is not uploaded due to the disqualified rating.");
        }
        metadata.Score = rating;
        // TODO: Probably want to save the repo URL in the metadata
      } catch (err) {
        console.error("Error handling /package request:", err);
        res
          .status(500)
          .send(
            "The package rating system choked on at least one of the metrics."
          );
      }

      const contentBuffer = Buffer.from(Content, "binary");

      // Check buffer size before uploading
      if (contentBuffer.length === 0) {
        debug("The uploaded content is empty or invalid.");
        return res
          .status(400)
          .send("The uploaded content is empty or invalid.");
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: packageKey,
          Body: contentBuffer,
          ContentType: "application/zip",
        })
      );
    } else if (URL) {
      try {
        const rating = await processUrl(URL);
        info("Rating: " + rating);

        if (rating.NetScore <= RATING_THRESHOLD) {
          debug("Package is not uploaded due to the disqualified rating.");
          return res
            .status(424)
            .send("Package is not uploaded due to the disqualified rating.");
        }
        metadata.Score = rating;
      } catch (err) {
        debug(
          "The package rating system choked on at least one of the metrics."
        );
        res
          .status(500)
          .send(
            "The package rating system choked on at least one of the metrics."
          );
      }

      const packageData = await downloadPackageFromURL(URL);
      if (!packageData || packageData.length === 0) {
        return res.status(400).send("Downloaded package is empty or invalid.");
      }

      Content = packageData.toString("base64");

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: packageKey,
          Body: packageData,
          ContentType: "application/zip",
        })
      );
    }

    // Add the package entry to the registry.json file
    // Check if the name field exists, and if not, initialize it
    if (!packageExists) {
      registry[Name] = [];
    }

    // Create the new registry entry
    const newRegistryEntry = {
      Name: Name,
      ID: packageID,
      Version: Version,
      TimeUploaded: timeUploaded,
      UsernameUploaded: username,
      Score: metadata.Score,
      Cost: metadata.Cost,
    };

    // Add the new entry to the name field
    registry[Name].push(newRegistryEntry);
    // console.log(registry);

    // Save the updated registry back to the JSON file
    // console.log(JSON.stringify(registry, null, 2));
    fs.writeFileSync(
      "./registry.json",
      JSON.stringify(registry, null, 2),
      "utf8"
    );

    // Data response object
    const data = {
      ...(Content !== undefined && { Content }),
      ...(URL !== undefined && { URL }),
      ...(JSProgram !== undefined && { JSProgram }),
    };

    // log response object for debugging
    const responseObject = {
      metadata,
      data,
    };
    // console.log("Response object:", responseObject);

    // debug("Responding with the following package information:");
    // debug the stringified response object (for testing)
    // debug(JSON.stringify(responseObject, null, 2));

    // Respond with the package information
    res.status(201).json({
      metadata,
      data,
    });
  } catch (error) {
    console.error("Error handling /package request:", error);
    res
      .status(500)
      .send("An error occurred while uploading or ingesting the package.");
  }
};

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

async function downloadPackageFromURL(url) {
  try {
    // Check if the URL is a GitHub repository URL
    if (url.includes("github.com")) {
      // Parse the GitHub URL to get the repository details
      const githubUrl = new URL(url);
      const parts = githubUrl.pathname.split("/").filter(Boolean);

      if (parts.length < 2) {
        throw new Error("Invalid GitHub URL.");
      }

      const username = parts[0];
      const repoName = parts[1];

      // Use GitHub API to get repository details
      const apiUrl = `https://api.github.com/repos/${username}/${repoName}`;
      const repoDetailsResponse = await axios.get(apiUrl);

      // Extract the default branch from the API response
      const defaultBranch = repoDetailsResponse.data.default_branch;

      // Construct the URL for downloading the ZIP file of the default branch
      const githubZipUrl = `https://github.com/${username}/${repoName}/archive/refs/heads/${defaultBranch}.zip`;

      // Fetch the ZIP file from GitHub
      const response = await axios.get(githubZipUrl, {
        responseType: "arraybuffer",
      });

      return response.data;
    } else if (url.includes("npmjs.org")) {
      // Parse the npm package name from the URL
      const npmPackageName = url.split("/").pop();

      // Construct the npm package metadata API URL
      const npmUrl = `https://registry.npmjs.org/${npmPackageName}/latest`;

      // Fetch the npm package metadata
      const response = await axios.get(npmUrl);

      if (response.data && response.data.dist && response.data.dist.tarball) {
        // Get the tarball URL for the latest version of the package
        const tarballUrl = response.data.dist.tarball;

        // Download the tarball package
        const packageResponse = await axios.get(tarballUrl, {
          responseType: "arraybuffer",
        });
        return packageResponse.data;
      } else {
        console.error("No tarball found for npm package.");
        return null;
      }
    } else {
      console.error("Unsupported URL format.");
      return null;
    }
  } catch (error) {
    console.error("Error downloading package:", error);
    return null;
  }
}

/**
 * Extracts the `package.json` from a base64-encoded zip file.
 * @param base64Zip The base64-encoded zip file string.
 * @returns The parsed JSON content of `package.json` if found, or `null`.
 */
async function extractRepoURL(base64Zip: string): Promise<string | null> {
  try {
    // Step 1: Decode the Base64 string
    const zipBuffer = Buffer.from(base64Zip, "base64");

    // Step 2: Parse the zip file
    const zip = new AdmZip(zipBuffer);

    // Step 3: Search for `package.json` in any directory
    const packageJsonEntry = zip
      .getEntries()
      .find((entry) => entry.entryName.endsWith("package.json"));
    if (!packageJsonEntry) {
      console.error("package.json not found in the zip file.");
      return null;
    }

    // Step 4: Read and parse `package.json`
    const packageJsonContent = packageJsonEntry.getData().toString("utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Step 5: Extract the repository URL
    let repositoryUrl: string | null = null;

    // Check for the `repository` field
    if (typeof packageJson.repository === "string") {
      repositoryUrl = packageJson.repository;
    } else if (
      typeof packageJson.repository === "object" &&
      typeof packageJson.repository.url === "string"
    ) {
      repositoryUrl = packageJson.repository.url;
    }
    // console.log(packageJson.repository.url);

    // Check for the top-level `url` field as a fallback
    if (!repositoryUrl && typeof packageJson.url === "string") {
      repositoryUrl = packageJson.url;
    }

    // Trim and clean up the URL
    if (repositoryUrl) {
      const match = repositoryUrl.match(/https:\/\/.+/);
      repositoryUrl = match ? match[0].trim() : null;

      // Remove `.git` at the end, if present
      if (repositoryUrl && repositoryUrl.endsWith(".git")) {
        repositoryUrl = repositoryUrl.slice(0, -4);
      }
    }

    return repositoryUrl;
  } catch (error) {
    console.error("Error extracting package.json:", error);
    return null;
  }
}
