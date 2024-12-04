import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as S3 from "@aws-sdk/client-s3";
import cors from "cors";
import crypto from "crypto";
import { Readable } from "stream";
import axios from "axios";
import fs from "fs/promises";
import jwt from "jsonwebtoken";
// import { processUrl } from "./app.js"
import {
  User,
  AuthenticationRequest,
  AuthenticationToken,
} from "./types/GitHubFile.js";

// Set up the backend server
const app = express();
app.use(cors());
const port = 8080;
app.use(express.json());

// Set up the S3 client
const s3Client = new S3.S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// set up the users database
const USERS_FILE = "./users.json";
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// (Get the packages from the registry.)
app.post("/packages", async (req, res) => {
  try {
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN;

    if (!authToken) {
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }
    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to access the registry.");
    }

    const { body: queries } = req;
    if (!Array.isArray(queries) || queries.some((q) => typeof q !== "object")) {
      return res
        .status(400)
        .send("Invalid PackageQuery array in request body.");
    }

    const offset = parseInt(req.header("offset") || "0", 10);
    const bucketName = process.env.S3_BUCKET;

    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    const listCommand = new S3.ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      res.setHeader("offset", offset + 0); // No next page
      return res.status(200).json([]);
    }

    const metadataPromises = listResponse.Contents.filter((object) =>
      object.Key.endsWith("metadata.json")
    ).map(async (object) => {
      const metadataKey = object.Key;
      try {
        const metadataResponse = await s3Client.send(
          new S3.GetObjectCommand({ Bucket: bucketName, Key: metadataKey })
        );
        const metadataBody = await metadataResponse.Body.transformToString();
        return JSON.parse(metadataBody);
      } catch (err) {
        console.error(`Error retrieving metadata for ${metadataKey}:`, err);
        return null;
      }
    });

    const allPackages = (await Promise.all(metadataPromises)).filter(
      (metadata) => metadata !== null
    );

    // Apply filters from PackageQuery
    const filteredPackages = allPackages.filter((pkg) => {
      return queries.some((query) => {
        // check name
        const nameMatches = query.name === "*" || pkg.Name === query.name;

        // check version
        const versionMatches = query.version
          ? pkg.Version.VersionNumber === query.version
          : true;
        return nameMatches && versionMatches;
      });
    });

    // Enforce limit to avoid too many results
    if (filteredPackages.length > 1000) {
      return res.status(413).send("Too many packages returned.");
    }

    // Paginate results
    const paginatedPackages = filteredPackages.slice(offset, offset + 10);
    const nextOffset = offset + paginatedPackages.length;

    // Set offset header
    res.setHeader("offset", nextOffset);

    // Structure response
    const response = paginatedPackages.map((pkg) => ({
      Name: pkg.Name,
      ID: pkg.ID,
      Version: pkg.Version.VersionNumber,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error handling /packages request:", error);
    res.status(500).send("An error occurred while retrieving the packages.");
  }
});

// (Reset the registry.)
app.delete("/reset", async (req, res) => {
  try {
    // Verify X-Authorization header
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN; // get the valid auth token from the environment
    if (!authToken) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }
    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to reset the registry.");
    }

    // Get bucket name from environment variables
    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // List all the objects in the bucket
    const listCommand = new S3.ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents;

    if (objects && objects.length > 0) {
      const deletePromises = objects.map((object) => {
        const deleteParams = {
          Bucket: bucketName,
          Key: object.Key,
        };
        return s3Client.send(new S3.DeleteObjectCommand(deleteParams));
      });
      await Promise.all(deletePromises);
    }

    res.status(200).send("Registry is reset.");
  } catch (error) {
    console.error("Error resetting registry:", error);
    res.status(500).send("Error resetting registry.");
  }
});

// (Interact with the package with this ID.)
app.get("/package/:id", async (req, res) => {
  try {
    const packageId = req.params.id;

    const authToken = req.header("X-Authorization"); // verify header
    const validToken = process.env.AUTH_TOKEN; // get the valid auth token from the environment
    if (!authToken) {
      // if no auth token
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }
    if (authToken !== validToken) {
      // if auth token invalid
      return res
        .status(401)
        .send("You do not have permission to access this package.");
    }

    const bucketName = process.env.S3_BUCKET; // if issues with s# bucket
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    const metadataKey = `${packageId}/metadata.json`; // metadata key

    // check package existence using package id
    try {
      await s3Client.send(
        new S3.HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
    } catch (err) {
      if (err.name === "NotFound") {
        return res.status(404).send("Package not found.");
      } else {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error retrieving package metadata.");
      }
    }

    const metadataResponse = await s3Client.send(
      // fetch metadata
      new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
      })
    );

    const metadata = JSON.parse(
      await streamToString(metadataResponse.Body as Readable)
    ); // turn to readable string

    const packageKey = `${packageId}/${metadata.Version.VersionNumber}/package.zip`; // fetch package content
    const packageResponse = await s3Client.send(
      new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: packageKey,
      })
    );

    const content = await streamToString(packageResponse.Body as Readable); // make package content readable in the same way as the metadata

    res.status(200).json({
      // respond with the data in the Readable format
      metadata,
      data: {
        Content: content, // can modify how content is sent (could send in base64)
      },
    });
  } catch (error) {
    console.error("Error handling /package/:id request:", error);
    res.status(500).send("An error occurred while retrieving the package.");
  }
});

// function for converting stream to readable string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (let chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// TODO: implement /package/{id} post endpoint
// (Update the content of this package.)
app.post("/package/:id", async (req, res) => {
  try {
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN;
    const bucketName = process.env.S3_BUCKET;

    if (!authToken) {
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }

    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to update this package.");
    }

    const packageId = req.params.id;
    const { Name, Version, Content, URL, JSProgram } = req.body;

    // Validation: Ensure required fields are present
    if (!Name || !Version || (!Content && !URL)) {
      return res.status(400).send("Missing required fields in request body.");
    }

    // Check if the package exists by checking the metadata
    const metadataKey = `${packageId}/metadata.json`;
    try {
      await s3Client.send(
        new S3.HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
    } catch (err) {
      if (err.name === "NotFound") {
        return res.status(404).send("Package does not exist.");
      } else {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error checking package existence.");
      }
    }

    // Update the package version
    const newVersionKey = `${packageId}/${Version}/package.zip`;
    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: bucketName,
        Key: newVersionKey,
        Body: Buffer.from(Content, "base64"), // Assuming content is base64 encoded
        ContentType: "application/zip",
      })
    );

    // Update metadata with the new version
    const metadata = {
      Name,
      Version,
      ID: packageId,
      UpdatedAt: new Date().toISOString(),
    };

    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
      })
    );

    // Return the updated package info
    res.status(200).json({
      metadata,
      data: {
        Content: Content,
        URL: URL,
        JSProgram,
      },
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).send("An error occurred while updating the package.");
  }
});

// (Upload or ingest a new package.)
app.post("/package", async (req, res) => {
  try {
    // Verify the X-Authorization header
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN; // Get the valid auth token from the environment
    if (!authToken) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }
    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to upload or ingest packages.");
    }

    const { Name, Version, JSProgram, Content, URL } = req.body;

    // Validate the request body
    if (!Name || !Version || !JSProgram || (!Content && !URL)) {
      return res
        .status(400)
        .send(
          "There are missing field(s) in the PackageData or it is formed improperly (e.g., both Content and URL are set)."
        );
    }

    // Generate a package ID based on the name (using SHA-256 hash for uniqueness)
    const packageID = crypto.createHash("sha256").update(Name).digest("hex");

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // Check if the package already exists
    const metadataKey = `${packageID}/metadata.json`;
    try {
      await s3Client.send(
        new S3.HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
      return res.status(409).send("Package already exists.");
    } catch (err) {
      if (err.name !== "NotFound") {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error checking package existence.");
      }
    }

    // Prepare package metadata
    const metadata = {
      Name,
      ID: packageID,
      Version: {
        VersionNumber: Version,
        UploadedBy: authToken,
        UploadedAt: new Date().toISOString(),
      },
    };

    // Upload metadata.json
    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: "application/json",
      })
    );

    // Upload the package content or ingest from URL
    const packageKey = `${packageID}/${Version}/package.zip`;
    if (Content) {
      await s3Client.send(
        new S3.PutObjectCommand({
          Bucket: bucketName,
          Key: packageKey,
          Body: Buffer.from(Content, "base64"),
          ContentType: "application/zip",
        })
      );
    } else if (URL) {
      // Download the package from the URL and upload it
      const isGithub = URL.includes("github.com");
      const isNPM = URL.includes("npmjs.com");

      if (isGithub) {
        // download the package from github
        const archiveURl = `${URL}/archive/refs/heads/main.zip`;
        try {
          const packageData = await axios.get(archiveURl, {
            responseType: "arraybuffer",
          });
          await s3Client.send(
            new S3.PutObjectCommand({
              Bucket: bucketName,
              Key: packageKey,
              Body: packageData.data,
              ContentType: "application/zip",
            })
          );
        } catch (err) {
          console.error("Error downloading package from GitHub:", err);
          return res.status(500).send("Error downloading package from GitHub.");
        }
      } else if (isNPM) {
        // NPM-specific handling
        try {
          // Extract the package name from the URL
          const packageName = URL.split("/").pop();
          const npmRegistryUrl = `https://registry.npmjs.org/${packageName}`;

          // Fetch the package metadata from the NPM registry
          const npmResponse = await axios.get(npmRegistryUrl);
          const tarballUrl = npmResponse.data["dist-tags"]?.latest
            ? npmResponse.data.versions[npmResponse.data["dist-tags"].latest]
                .dist.tarball
            : null;

          if (!tarballUrl) {
            return res
              .status(400)
              .send(
                "Unable to determine tarball URL for the specified NPM package."
              );
          }

          // Download the tarball
          const packageData = await axios.get(tarballUrl, {
            responseType: "arraybuffer",
          });
          await s3Client.send(
            new S3.PutObjectCommand({
              Bucket: bucketName,
              Key: packageKey,
              Body: packageData.data,
              ContentType: "application/gzip",
            })
          );
        } catch (err) {
          console.error("Error downloading or uploading NPM package:", err);
          return res
            .status(500)
            .send("Error downloading or uploading the NPM package.");
        }
      } else {
        return res
          .status(400)
          .send(
            "Unsupported URL format. Only GitHub and NPM URLs are supported."
          );
      }
    }

    // Respond with the package information
    res.status(201).json({
      message: "Package uploaded successfully",
      metadata,
      data: {
        JSProgram,
        ...(Content !== undefined && { Content }),
        ...(URL !== undefined && { URL }),
      },
    });
  } catch (error) {
    console.error("Error handling /package request:", error);
    res
      .status(500)
      .send("An error occurred while uploading or ingesting the package.");
  }
});

// TODO: implement /package/{id}/rate
// (Get ratings for this package.)
// app.get("/package/:id/rate", (req, res) => {});

// /package/{id}/cost endpoint
// (Get the cost of this package.)
app.get("/package/:id/cost", async (req, res) => {
  try {
    // Extract and validate the required headers and parameters
    const authToken = req.header("X-Authorization"); // same as other call
    const validToken = process.env.AUTH_TOKEN; // same as other call
    const packageId = req.params.id; // get package id according to spec
    const includeDependency = req.query.dependency === "true"; // for if the cost includes dependencies

    // top add in again when not just testing
    // if (!authToken) {                                     // same as previous api structure
    //   return res
    //     .status(403)
    //     .send("Authentication failed due to invalid or missing AuthenticationToken.");
    // }
    // if (authToken !== validToken) {                       // same as previous api structure (but for costs)
    //   return res
    //     .status(401)
    //     .send("You do not have permission to access package costs.");
    // }
    // bottom add back in when not just testing

    if (!packageId) {
      // new because we need package ID acessible to get cost
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID.");
    }

    const bucketName = process.env.S3_BUCKET; // s3 bucket must be referenced
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    const metadataKey = `${packageId}/metadata.json`; // retrieve metadata
    let packageMetadata;
    try {
      const metadataResponse = await s3Client.send(
        new S3.GetObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
      const metadataBody = await metadataResponse.Body.transformToString();
      packageMetadata = JSON.parse(metadataBody);
    } catch (err) {
      if (err.name === "NoSuchKey") {
        return res.status(404).send("Package does not exist.");
      }
      console.error("Error retrieving package metadata:", err);
      return res.status(500).send("Error retrieving package metadata.");
    }

    // get the costs from the data
    const calculateTotalCost = async (id) => {
      const metadataKey = `${id}/metadata.json`;
      try {
        const metadataResponse = await s3Client.send(
          new S3.GetObjectCommand({ Bucket: bucketName, Key: metadataKey })
        );
        const metadataBody = await metadataResponse.Body.transformToString();
        const packageData = JSON.parse(metadataBody);

        let totalCost = packageData.standaloneCost || 0;
        if (includeDependency && packageData.dependencies) {
          for (const depId of packageData.dependencies) {
            const depCost = await calculateTotalCost(depId);
            totalCost += depCost.totalCost;
          }
        }
        return {
          standaloneCost: packageData.standaloneCost || 0,

          totalCost,
        };
      } catch (err) {
        console.error(`Error calculating cost for package ${id}:`, err);
        throw new Error("Error calculating package cost.");
      }
    };

    // actually calculate costs
    try {
      const cost = await calculateTotalCost(packageId);

      const response = includeDependency
        ? {
            [packageId]: cost,
            ...(packageMetadata.dependencies || []).reduce(
              async (accPromise, depId) => {
                const acc = await accPromise;
                const depCost = await calculateTotalCost(depId); // we calculate the cost for each dependency
                return {
                  ...acc,
                  [depId]: depCost, // and we add the dependency cost to the total cost
                };
              },
              Promise.resolve({})
            ),
          }
        : { [packageId]: { totalCost: cost.totalCost } }; // total cost is just cost (no dependencies)
      return res.status(200).json(response);
    } catch (error) {
      console.error("Error calculating package cost:", error);
      return res
        .status(500)
        .send(
          "The package rating system choked on at least one of the metrics."
        ); // as per spec
    }
  } catch (error) {
    console.error("Error handling /package/:id/cost request:", error);
    res.status(500).send("An error occurred while processing the request."); // to cover the whole api structure as an error
  }
});

// TODO: implement /authenticate
//  endpoint
// (Create an access token.)
// (NON-BASELINE)
app.put("/authenticate", async (req, res) => {
  try {
    const body: AuthenticationRequest = req.body;

    // Validate request body
    if (
      !body ||
      !body.User ||
      !body.Secret ||
      !body.User.name ||
      !body.Secret.password
    ) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the AuthenticationRequest or it is formed improperly."
        );
    }

    const { name } = body.User;
    const { password } = body.Secret;

    // Read the users file
    const userFileData = await fs.readFile(USERS_FILE, "utf-8");
    const users = userFileData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [storedName, storedPassword, permLevel] = line.split(",");
        return {
          name: storedName,
          password: storedPassword,
          perm_level: parseInt(permLevel, 10),
        };
      }) as User[];

    // Check user credentials
    const user = users.find((u) => u.name === name && u.password === password);

    if (!user) {
      return res.status(401).send("The user or password is invalid.");
    }

    // Generate JWT token
    const tokenPayload = {
      name: user.name,
      perm_level: user.perm_level,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });

    // Return the token
    const response: AuthenticationToken = { token: `bearer ${token}` };
    return res.status(200).json(response);
  } catch (err) {
    console.error("Error handling /authenticate request:", err);
    return res.status(501).send("This system does not support authentication.");
  }
});

// (Get any packages fitting the regular expression.)
app.post("/package/byRegEx", async (req, res) => {
  try {
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN;
    const bucketName = process.env.S3_BUCKET;

    if (!authToken) {
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }

    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to access this registry.");
    }

    const { RegEx } = req.body;

    // Validate the request body
    if (!RegEx || typeof RegEx !== "string") {
      return res
        .status(400)
        .send("The request is missing a valid RegEx field.");
    }

    // Compile the regex
    let regex;
    try {
      regex = new RegExp(RegEx);
    } catch (error) {
      return res.status(400).send("The provided RegEx is invalid.");
    }

    // List objects in the bucket
    const listCommand = new S3.ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return res.status(404).send("No packages available in the registry.");
    }

    // Filter metadata files
    const metadataKeys = listResponse.Contents.filter((object) =>
      object.Key.endsWith("metadata.json")
    ).map((object) => object.Key);

    if (metadataKeys.length === 0) {
      return res.status(404).send("No packages available for search.");
    }

    // Search using RegEx
    const matchedPackages = [];
    for (const key of metadataKeys) {
      try {
        const metadataResponse = await s3Client.send(
          new S3.GetObjectCommand({ Bucket: bucketName, Key: key })
        );
        const metadataBody = await metadataResponse.Body.transformToString();
        const metadata = JSON.parse(metadataBody);

        // Check if package matches the RegEx
        if (
          regex.test(metadata.Name) ||
          (metadata.Description && regex.test(metadata.Description))
        ) {
          matchedPackages.push({
            Name: metadata.Name,
            Version: metadata.Version,
            ID: metadata.ID,
          });
        }
      } catch (err) {
        console.error(`Error retrieving or parsing metadata for ${key}:`, err);
        // Continue to the next package
      }
    }

    if (matchedPackages.length === 0) {
      return res.status(404).send("No package found under this regex.");
    }

    // Return the matched packages
    res.status(200).json(matchedPackages);
  } catch (error) {
    console.error("Error processing /package/byRegEx request:", error);
    res.status(500).send("An error occurred while searching packages.");
  }
});

// (Get the list of tracks the team is implementing.)
app.get("/tracks", (req, res) => {
  try {
    const tracks = ["Access control track"];
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({
      error:
        "The system encountered an error while retrieving the student's track information.",
    });
  }
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
