import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { processUrl } from "../utils/phase1_app.js";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const getPackageIDRate = async (req, res) => {
  console.log("PACKAGE ID RATE");
  try {
    // Extract token from the Authorization header (Bearer <token>)
    const authHeader = req.header("X-Authorization");

    if (!authHeader) {
      return res.status(403).send("Authentication failed due to invalid or missing AuthenticationToken.");
    }

    const token = authHeader.split(" ")[1]; // Extract token part
    if (!token) {
      return res.status(403).send("Authentication failed due to invalid or missing AuthenticationToken.");
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = (decoded as jwt.JwtPayload).name;

    // Get Package ID
    const packageId = req.params.id; // get package id according to spec
    console.log("ID: ", packageId);
    if (!packageId) {
      // new because we need package ID acessible to get cost
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID.");
    }

    // Get Package Metadata
    const bucketName = process.env.S3_BUCKET; // s3 bucket must be referenced
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    let score = await getScoreFromRegistry(packageId);
    // if (score == null) {
    //   score = await processUrl(URL);

    // }






  } catch (err) {
    console.error("Error handling /package/{id}/rate request:", err);
    res.status(500).send("The package rating system choked on at least one of the metrics.");
  }

};

async function getScoreFromRegistry(ID: string): Promise<string | null> {
  const filePath = "registry.csv";

  try {
    // Read the CSV file as a string
    const data = await fs.promises.readFile(filePath, "utf8");

    // Split the file into rows
    const rows = data.trim().split("\n");

    // Get the header and data rows
    const headers = rows[0].split(",");
    const dataRows = rows.slice(1);

    // Find the index of relevant columns
    const nameIndex = headers.indexOf("ID");
    const scoreIndex = headers.indexOf("score");

    if (nameIndex === -1 || scoreIndex === -1) {
      throw new Error("Required columns not found in the CSV file.");
    }

    // Search for the row with correct ID
    for (const row of dataRows) {
      const columns = row.split(",");

      if (columns[nameIndex] === ID) {
        return columns[scoreIndex];
      }
    }

    // Return null if ID not found
    return null;

  } catch (error) {
    console.error("Error reading or processing the CSV file:", error);
    return null;
  }
}
