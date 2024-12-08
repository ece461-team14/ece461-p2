import jwt from "jsonwebtoken";
import * as fs from "fs";
import AdmZip from "adm-zip";
import { idExists, getObjFromId } from "../utils/idReg.js";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
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
        .status(403)
        .send("Token format is incorrect. Use 'Bearer <token>'");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token payload:", decoded);

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
        packageData = extractJsonFromZip(packageBody);
        console.log(packageData.files);

        let totalCost = packageData.standaloneCost || 0;
        console.log(packageData.standaloneCost);
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
            ...(packageData.dependencies || []).reduce(
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
};

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
