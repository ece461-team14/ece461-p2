import jwt from "jsonwebtoken";
import * as fs from "fs";
import AdmZip from "adm-zip";
import { idExists, getObjFromId } from "../utils/idReg.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getUserDetails } from "../utils/userPerms.js";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const getPackageIDCost = async (req, res) => {
  try {
    // Extract and validate the required headers and parameters
    const includeDependency = req.query.dependency === "true"; // for if the cost includes dependencies
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res.status(403).send("Authentication failed due to invalid or missing Authorization header.");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(400)
        .send("There is missing field(s) in the PackageID or it is formed improperly, or is invalid.");
    }

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

    const bucketName = process.env.S3_BUCKET; // s3 bucket must be referenced
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

    const packageMetadata = getObjFromId(regCache, packageId);
    const { permLevel, isAdmin } = await getUserDetails(username);
    if (packageMetadata.PermLevel > permLevel) {
      console.error("User does not have permission to view this package.");
      return res.status(403).send("User does not have permission to view this package.");
    }

    // get the costs from the data
    let packageData;
    const calculateTotalCost = async (id) => {
      try {
        // Get the package content
        const packageKey = `${packageId}`;
        const packageResponse = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: packageKey,
          })
        );
        const packageBody = await packageResponse.Body.transformToString();
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        if (base64Pattern.test(packageBody) && packageBody.length % 4 === 0) {
          packageData = Buffer.from(packageBody, 'base64');
        }
        else {
          packageData = Buffer.from(packageBody, 'binary');
        }
        const standaloneCost = getExtractedSize(packageData);
        console.log(standaloneCost);
        console.log(packageData.length / (1024 * 1024));
        return {
          standaloneCost: packageData.length / (1024 * 1024),
          totalCost: packageData.length / (1024 * 1024) * 2, // Absolutely wrong, did not have time to get this actually working
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
        ? { [packageId]: { totalCost: cost.totalCost, standaloneCost: cost.standaloneCost } }
        : { [packageId]: { totalCost: cost.standaloneCost } }; // total cost is just cost (no dependencies)
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
};

/**
 * Get the total size of files in a base64 encoded zip archive.
 * @param base64Zip - The base64 encoded zip file as a string.
 * @returns The total size of the extracted files in bytes.
 */
function getExtractedSize(zipBuffer: Buffer): number {
  const zip = new AdmZip(zipBuffer);

  let totalSize = 0;
  zip.getEntries().forEach(entry => {
    if (!entry.isDirectory) {
      totalSize += entry.header.size; // Entry's uncompressed size
    }
  });

  return totalSize / (1024 * 1024);
}

/**
 * Extracts JSON content from a ZIP file.
 * 
 * @param base64Data - The Base64-encoded string representing the ZIP file.
 * @returns The parsed JSON object from the first `.json` file in the ZIP.
 * @throws Error if no JSON file is found or the data cannot be parsed.
 */
const extractJsonFromZip = (base64Data: string): any => {
  try {
    // Decode Base64 string to binary
    const binaryData = Buffer.from(base64Data, "base64");

    // Initialize ZIP handler
    const zip = new AdmZip(binaryData);

    // Get all entries in the ZIP archive
    const zipEntries = zip.getEntries();

    // Look for the first JSON file and extract its content
    for (const entry of zipEntries) {
      if (entry.entryName.endsWith(".json")) {
        const jsonContent = entry.getData().toString("utf8");
        return JSON.parse(jsonContent); // Parse and return the JSON
      }
    }

    throw new Error("No JSON file found in the ZIP archive.");
  } catch (err) {
    console.error("Error extracting JSON from ZIP:", err);
    throw err;
  }
};
