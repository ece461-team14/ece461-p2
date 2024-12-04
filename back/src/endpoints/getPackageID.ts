import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const getPackageID = async (req, res) => {
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
        new HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
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
      new GetObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
      })
    );

    const metadata = JSON.parse(
      await streamToString(metadataResponse.Body as Readable)
    ); // turn to readable string

    const packageKey = `${packageId}/${metadata.Version.VersionNumber}/package.zip`; // fetch package content
    const packageResponse = await s3Client.send(
      new GetObjectCommand({
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
};

// function for converting stream to readable string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (let chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
