import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import * as fs from "fs";
import { Readable } from "stream";
import { idExists, getObjFromId } from "../utils/idReg.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
// import { get } from "axios";
dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const getPackageID = async (req, res) => {
  try {
    const packageId = req.params.id;

    // Extract token from the Authorization header (Bearer <token>)
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send("Authentication failed due to missing Authorization header.");
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    if (!token) {
      return res
        .status(403)
        .send("Token format is incorrect. Use 'Bearer <token>'");
    }

    // Verify the JWT token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .send("Authentication failed. Invalid or expired token.");
      }

      // Proceed with the request handling (retrieving package)
      const bucketName = process.env.S3_BUCKET; // Get bucket name from environment
      if (!bucketName) {
        return res.status(500).send("S3 bucket name is not set.");
      }

      const regCache = JSON.parse(fs.readFileSync("registry.json", "utf-8"));

      // Check package existence using package ID
      try {
        // check if package ID exists in regCache
        if (!idExists(regCache, packageId)) {
          return res.status(404).send("Package not found.");
        }
      } catch (err) {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error retrieving package metadata.");
      }

      // get object with given ID
      const metadata = getObjFromId(regCache, packageId);

      // Get the package content
      const packageKey = `${packageId}`;
      const packageResponse = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: packageKey,
        })
      );

      const content = await streamToString(packageResponse.Body as Readable);

      // Send response with metadata and content
      res.status(200).json({
        metadata,
        data: {
          // send content in base64 format
          Content: content,
        },
      });
    });
  } catch (error) {
    console.error("Error handling /package/:id request:", error);
    res.status(500).send("An error occurred while retrieving the package.");
  }
};

// Helper function for converting stream to string
async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (let chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}
