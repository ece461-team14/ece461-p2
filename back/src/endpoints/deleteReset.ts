import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const deleteReset = async (req, res) => {
  try {
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res.status(403).send("Authentication failed due to invalid or missing Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(403)
        .send("Token format is incorrect. Use 'Bearer <token>'");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token payload:", decoded);

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });
      const listResponse = await s3Client.send(listCommand);
      const objects = listResponse.Contents || [];

      const deletePromises = objects.map((object) =>
        s3Client.send(
          new DeleteObjectCommand({ Bucket: bucketName, Key: object.Key })
        )
      );
      await Promise.allSettled(deletePromises);

      continuationToken = listResponse.NextContinuationToken;
      isTruncated = !!listResponse.IsTruncated;
    }

    // reset the registry.csv and users.csv files
    fs.writeFileSync("./registry.json", JSON.stringify({}, null, 2));
    fs.writeFileSync("./users.csv", "username,password,permLevel,isAdmin\n");
    const defaultUser =
      "ece30861defaultadminuser,correcthorsebatterystaple123(!__+@**(A'\"`;DROP TABLE packages;,2,true";
    fs.appendFileSync("./users.csv", defaultUser + "\n");

    res.status(200).send("Registry is reset.");
  } catch (error) {
    console.error("Error resetting registry:", error);
    res.status(500).send("Error resetting registry.");
  }
};
