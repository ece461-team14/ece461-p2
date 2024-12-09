import jwt from "jsonwebtoken";
import crypto from "crypto";
import { executeJsOnZip } from "../utils/runJSProgram.js";
import { processUrl } from "../utils/phase1_app.js";
import { info, debug, silent } from "../utils/logger.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { extractRepoURL, downloadPackageFromURL } from "../utils/getPackage.js";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const RATING_THRESHOLD = 0.2;

export const postPackageID = async (req, res) => {
  console.log("HANDLING /update PACKAGE REQUEST");
  try {
    // Extract token from the X-Authorization header
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send("Authentication failed due to missing Authorization header.");
    }

    const token = authHeader.split(" ")[1]; // Extract token part
    if (!token) {
      debug("Token format is incorrect. Use 'Bearer <token>'");
      return res
        .status(403)
        .send(
          "Authentication failed due to missing or invalid Authorization token."
        );
    }

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }

    const username = decoded.name;

    // Extract the package metadata and data from the request body
    const { metadata, data } = req.body;
    // console.log(req.body);
    // console.log(metadata);
    // console.log(data);
    const ID = req.body.metadata.ID;
    const Version = req.body.metadata.Version;
    console.log(req.body);
    const { Content, URL, JSProgram, Debloat } = data;

    // Validate request body
    if (!ID || (!Content && !URL)) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
        );
    }

    // Load the registry to check for existing packages
    let registry = {};
    if (fs.existsSync("./registry.json")) {
      const fileContent = fs.readFileSync("./registry.json", "utf8");
      registry = JSON.parse(fileContent);
    }

    // Check if the package exists in the registry
    const packageEntry = Object.entries(registry).find(
      ([, packages]: [string, any[]]) =>
        packages.some((entry) => entry.ID === ID)
    );

    if (!packageEntry) {
      return res.status(404).send("Package does not exist.");
    }

    let [packageName, packageList] = packageEntry as [
      string,
      { ID: string; Version: string; UploadMethod: string; Name: string }[]
    ];

    // Parse packagelist for only packages with matching "Name"
    packageList = packageList.filter((entry) => entry.Name === packageName);

    const existingPackage = packageList.find((entry) => entry.ID === ID);

    if (!existingPackage) {
      return res.status(404).send("Package does not exist.");
    }

    const { Name } = existingPackage;

    // Validate version
    if (!Version) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
        );
    }

    // Ensure the upload method matches
    const uploadMethod = Content ? "Upload" : "URL";
    if (existingPackage.UploadMethod !== uploadMethod) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
        );
    }

    // Check version against registry versions
    const versionExists = packageList.some(
      (entry) => entry.Version === Version
    );
    if (versionExists) {
      return res.status(409).send("Version already exists in registry.");
    }

    // Compare version numbers
    const versionComparator = (v1, v2) => {
      const [major1, minor1, patch1] = v1.split(".").map(Number);
      const [major2, minor2, patch2] = v2.split(".").map(Number);
      if (major1 === major2 && minor1 === minor2 && patch1 < patch2) {
        return -1;
      }
      return 0;
    };

    const invalidVersion = packageList.some(
      (entry) => versionComparator(Version, entry.Version) < 0
    );

    if (invalidVersion) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
        );
    }

    // Generate metadata for the new version
    const timeUpdated = new Date().toISOString();
    const newMetadata = {
      Name,
      Version,
      ID: ID,
      JSProgram,
      TimeUpdated: timeUpdated,
      UsernameUploaded: username,
      Score: {},
      Cost: -1,
    };

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // Handle content or URL upload
    console.log("Name-Version: ", `${Name}-${Version}`);
    const packageID = crypto
      .createHash("sha256")
      .update(`${Name}-${Version}`)
      .digest("hex");

    if (Content) {
      try {
        const repoURL = await extractRepoURL(Content);
        const rating = await processUrl(repoURL);
        newMetadata.Score = rating;

        const contentBuffer = Buffer.from(Content, "binary");
        if (contentBuffer.length === 0) {
          debug("The uploaded content is empty or invalid.");
          return res
            .status(400)
            .send(
              "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
            );
        }

        if (JSProgram) {
          const programResponse = await executeJsOnZip(
            Content,
            JSProgram,
            metadata,
            username
          );
          if (programResponse === 1) {
            return res
              .status(406)
              .send("Package has failed sensitive module check.");
          }
        }

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: packageID,
            Body: contentBuffer,
            ContentType: "application/zip",
          })
        );
      } catch (error) {
        debug("Failed to calculate score or upload content " + error);
        return res
          .status(400)
          .send(
            "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
          );
      }
    } else if (URL) {
      try {
        const rating = await processUrl(URL);
        newMetadata.Score = rating;
        const packageData = await downloadPackageFromURL(URL);

        if (!packageData || packageData.length === 0) {
          return res
            .status(400)
            .send(
              "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
            );
        }

        if (JSProgram) {
          const programResponse = await executeJsOnZip(
            packageData.toString("base64"),
            JSProgram,
            metadata,
            username
          );
          if (programResponse === 1) {
            return res
              .status(406)
              .send("Package has failed sensitive module check.");
          }
        }

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: packageID,
            Body: packageData,
            ContentType: "application/zip",
          })
        );
      } catch (error) {
        debug("Failed to process URL or upload package: " + error);
        return res
          .status(400)
          .send(
            "There is missing field(s) in the PackageID or it is formed improperly, or is invalid."
          );
      }
    }

    // Update registry
    newMetadata.ID = packageID;
    registry[packageName].push(newMetadata);
    fs.writeFileSync(
      "./registry.json",
      JSON.stringify(registry, null, 2),
      "utf8"
    );

    res.status(200).send("Version is updated.");
  } catch (error) {
    console.error("Error handling /update package request:", error);
    res.status(500).send("An error occurred while updating the package.");
  }
};
