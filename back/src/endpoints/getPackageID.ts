import { S3Client } from "@aws-sdk/client-s3";
import * as fs from "fs";
import { idExists, getObjFromId } from "../utils/idReg.js";
import { getPackageFromID } from "../utils/s3Utils.js";
import { executeJsOnZip } from "../utils/runJSProgram.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { getUserDetails } from "../utils/userPerms.js";
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
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    if (!token) {
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID or it is formed improperly, or is invalid.");
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
        return res.status(404).send("Package does not exist.");
      }
    } catch (err) {
      console.error("Error checking package existence:", err);
      return res.status(500).send("Error retrieving package metadata.");
    }

    // get object with given ID
    const metadata = getObjFromId(regCache, packageId);
    const { permLevel, isAdmin } = await getUserDetails(username);
    if (metadata.PermLevel > permLevel) {
      console.error("User does not have permission to view this package.");
      return res.status(403).send("User does not have permission to view this package.");
    }

    // Get the package content
    const packageResponse = await getPackageFromID(bucketName, packageId);
    const content = packageResponse.toString("base64");

    if (metadata.JSProgram) {
      const programResponse = await executeJsOnZip(content, metadata.JSProgram, metadata, username);
      if (programResponse === 1) {
        return res
          .status(406)
          .send("Package has failed sensitive module check.");
      }
    }

    // Module Download History
    if (metadata.DownloadHistory !== undefined) {
      metadata.DownloadHistory.push({
        User: username,
        DownloadTime: new Date().toISOString()
      });
    }
    else {
      metadata.DownloadHistory = [{
        User: username,
        DownloadTime: new Date().toISOString()
      }];
    }

    fs.writeFileSync(
      "./registry.json",
      JSON.stringify(regCache, null, 2),
      "utf8"
    );

    // Send response with metadata and content
    res.status(200).json({
      metadata: {
        Name: metadata.Name,
        Version: metadata.Version,
        ID: metadata.ID,
      },
      data: {
        // send content in base64 format
        Content: content,
      },
    });
  } catch (error) {
    console.error("Error handling /package/:id request:", error);
    res.status(500).send("An error occurred while retrieving the package.");
  }
};
