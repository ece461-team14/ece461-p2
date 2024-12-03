import dotenv from "dotenv";
dotenv.config();
import express from "express";
import * as S3 from "@aws-sdk/client-s3";
import multer from "multer";
import cors from "cors";
import crypto from "crypto";
import { Readable } from "stream"

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

// Set up the multer storage
const upload = multer({ storage: multer.memoryStorage() });

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// TODO: remove this for final prod
// Test file upload endpoint
app.post("/test_upload_file", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // Define the parameters for the S3 upload
    const uploadParams = {
      Bucket: bucketName,
      Key: req.file.originalname, // Using the original file name as the key
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // Upload the file to S3
    const command = new S3.PutObjectCommand(uploadParams);
    await s3Client.send(command);

    res
      .status(200)
      .send(`File uploaded successfully: ${req.file.originalname}`);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).send("Error uploading file.");
  }
});

// TODO: implement /packages endpoint
// (Get the packages from the registry.)
app.post("/packages", (req, res) => {});

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

// TODO: implement /package/{id} get endpoint
// (Interact with the package with this ID.)
app.get("/package/:id", async (req, res) => {
  try {
    const packageId = req.params.id;

    const authToken = req.header("X-Authorization");  // verify header
    const validToken = process.env.AUTH_TOKEN; // get the valid auth token from the environment
    if (!authToken) {                           // if no auth token
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }
    if (authToken !== validToken) {             // if auth token invalid
      return res.status(401).send("You do not have permission to access this package.");
    }

    const bucketName = process.env.S3_BUCKET;   // if issues with s# bucket
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    const metadataKey = `${packageId}/metadata.json`;   // metadata key

    // check package existence using package id
    try {
      await s3Client.send(new S3.HeadObjectCommand({ Bucket: bucketName, Key: metadataKey }));
    } catch (err) {
      if (err.name === "NotFound") {
        return res.status(404).send("Package not found.");
      } else {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error retrieving package metadata.");
      }
    }

    const metadataResponse = await s3Client.send(   // fetch metadata
      new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
      })
    );

    const metadata = JSON.parse(await streamToString(metadataResponse.Body as Readable));   // turn to readable string

    const packageKey = `${packageId}/${metadata.Version}/package.zip`;    // fetch package content
    const packageResponse = await s3Client.send(
      new S3.GetObjectCommand({
        Bucket: bucketName,
        Key: packageKey,
      })
    );

    const content = await streamToString(packageResponse.Body as Readable);   // make package content readable in the same way as the metadata

    res.status(200).json({      // respond with the data in the Readable format
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
app.post("/package/:id", (req, res) => {});

// TODO: implement /package endpoint
// (Upload or ingest a new package.)
app.post("/package", async (req, res) => {
  try {
    // Verify the X-Authorization header
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
        .send("You do not have permission to upload or ingest packages.");
    }

    const { Name, Version, JSProgram, Content, URL } = req.body;

    // Validation
    if (!Name || !Version || !JSProgram || (!Content && !URL)) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageData or it is formed improperly (e.g., both Content and URL are set)."
        );
    }

    // Generate a package ID based on the name (using a hash for uniqueness)
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
      return res.status(409).send("Package exists already.");
    } catch (err) {
      if (err.name !== "NotFound") {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error checking package existence.");
      }
    }

    // Prepare package metadata
    const metadata = {
      Name,
      Version,
      ID: packageID,
    };

    await s3Client.send(
      new S3.PutObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
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
      // Download the package from the URL
      // TODO: implement this
      return res.status(501).send("URL ingestion is not implemented yet.");
    }

    // Respond with the package information
    res.status(201).json({
      metadata,
      data: {
        Content: Content ? Content : undefined,
        URL: URL ? URL : undefined,
        JSProgram,
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
app.get("/package/:id/rate", (req, res) => {});

// TODO: implement /package/{id}/cost
// /package/{id}/cost endpoint
// (Get the cost of this package.)
app.get("/package/:id/cost", (req, res) => {});

// TODO: implement /authenticate
//  endpoint
// (Create an access token.)
// (NON-BASELINE)
app.put("/authenticate", (req, res) => {});

// TODO: implement /package/byRegEx
// (Get any packages fitting the regular expression.)
app.post("/package/byRegEx", (req, res) => {});

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
