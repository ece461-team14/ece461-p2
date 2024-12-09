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
import { getUserDetails } from "../utils/userPerms.js";

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
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
      return res.status(403).send("Authentication failed due to invalid or missing AuthenticationToken.");
    }
    const username = decoded.name;

    // Get Package ID
    const packageId = req.params.id; // get package id according to spec
    console.log("package id: ", packageId);
    if (!packageId) {
      // new because we need package ID acessible to get cost
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID.");
    }

    // Get Package Metadata
    const registryEntry = getRegistryEntry(packageId);
    if (registryEntry === null) {
      console.log("Package does not exist.");
      return res.status(404).send("Package does not exist.");
    }
    else if (Object.keys(registryEntry.Score).length === 0) {
      console.log("Package does not exist.");
      return res.status(500).send("The package rating system choked on at least one of the metrics.");
    }

    const { permLevel, isAdmin } = await getUserDetails(username);
    if (registryEntry.PermLevel > permLevel) {
      console.error("User does not have permission to view this package.");
      return res.status(403).send("User does not have permission to view this package.");
    }

    return res.status(200).send(registryEntry.Score);
  } catch (err) {
    console.error("Error handling /package/{id}/rate request:", err);
    res.status(500).send("The package rating system choked on at least one of the metrics.");
  }

};

function getRegistryEntry(targetId: string): any | null {
  let registry;
  if (fs.existsSync("./registry.json")) {
    // Load the existing JSON object from the file
    const fileContent = fs.readFileSync("./registry.json", "utf-8");
    registry = JSON.parse(fileContent); // Parse the JSON content into an object
  }
  else {
    return null;
  }

  // Iterate over the keys (name fields) in the registry
  for (const nameField in registry) {
    if (Object.hasOwnProperty.call(registry, nameField)) {
      // Iterate over the array of objects under each name field
      for (const entry of registry[nameField]) {
        if (entry.ID === targetId) {
          return entry; // Return the object with the matching ID
        }
      }
    }
  }
  return null; // Return null if no match is found
}