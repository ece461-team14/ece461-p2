import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const deleteReset = async (req, res) => {
  try {
    // Verify the 'Authorization' header
    const authHeader = req.header("X-Authorization");
    
    // If no Authorization header is found, return 403 error
    if (!authHeader) {
      return res.status(403).send("Authentication token is missing.");
    }

    // The 'Authorization' header should look like "Bearer <token>"
    const token = authHeader.split(" ")[1]; // Extract token from "Bearer <token>"
    
    if (!token) {
      return res.status(403).send("Token format is incorrect. Use 'Bearer <token>'");
    }

    // Verify the token using the secret key
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).send("Authentication failed. Invalid or expired token.");
      }

      // If token is valid, proceed with the request
      //console.log("Token is valid. Decoded payload:", decoded);

      // Get bucket name from environment variables
      const bucketName = process.env.S3_BUCKET;
      if (!bucketName) {
        return res.status(500).send("S3 bucket name is not set.");
      }

      // List all the objects in the bucket
      const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
      const listResponse = await s3Client.send(listCommand);
      const objects = listResponse.Contents;

      if (objects && objects.length > 0) {
        const deletePromises = objects.map((object) => {
          const deleteParams = {
            Bucket: bucketName,
            Key: object.Key,
          };
          return s3Client.send(new DeleteObjectCommand(deleteParams));
        });
        await Promise.all(deletePromises);
      }

      res.status(200).send("Registry is reset.");
    });
  } catch (error) {
    console.error("Error resetting registry:", error);
    res.status(500).send("Error resetting registry.");
  }
};
