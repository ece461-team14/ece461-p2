import jwt from "jsonwebtoken";
import { info, debug, silent } from "../utils/logger.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { extractRepoURL, downloadPackageFromURL } from "../utils/getPackage.js";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const RATING_THRESHOLD = 0.4;

export const postPackageID = async (req, res) => {
  try {
    // Extract token from the X-Authorization header
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send("Authentication failed due to missing Authorization header.");
    }

    const token = authHeader.split(" ")[1]; // Extract token part
    if (!token) {
      debug("Token format is incorrect. Use 'Bearer <token>");
      return res
        .status(403)
        .send(
          "Authentication failed due to missing or invalid Authorization token."
        );
    }

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    }
    catch (error) {
      return res.status(403).send("Authentication failed due to invalid or missing AuthenticationToken.");
    }
    const username = (decoded as jwt.JwtPayload).name;

    // Extract the package ID and data from the request body
    const { metadata, data } = req.body;
    const { ID, Version } = metadata;
    const { Content, URL, JSProgram } = data;

    // Validate the request body
    if (!ID || (!Content && !URL)) {
      return res
        .status(400)
        .send(
          "Missing field(s) or improper request body (e.g., both Content and URL are set)."
        );
    }

    // Load the registry to check for the existing package
    let registry = {};
    if (fs.existsSync("./registry.json")) {
      const fileContent = fs.readFileSync("./registry.json", "utf8");
      registry = JSON.parse(fileContent);
    }

    // Check if the package exists in the registry
    const packageEntry = Object.entries(registry).find(([, packages]) =>
      (packages as any[]).some((entry) => entry.ID === ID)
    );

    if (!packageEntry) {
      return res.status(404).send("Package with the given ID does not exist.");
    }

    const [packageName, packageList]: [string, any[]] = packageEntry as [
      string,
      any[]
    ];
    const existingPackage = packageList.find((entry) => entry.ID === ID);

    if (!existingPackage) {
      return res.status(404).send("Package with the given ID does not exist.");
    }

    const { Name, Version: existingVersion } = existingPackage;

    // Validate if the new version is more recent than the current one
    if (!Version || Version <= existingVersion) {
      return res
        .status(400)
        .send("New version must be greater than the existing version.");
    }

    // Generate metadata for the response
    const timeUpdated = new Date().toISOString();
    const response_metadata = {
      Name,
      Version: Version,
      ID: ID,
      JSProgram,
      TimeUpdated: timeUpdated,
      UsernameUploaded: username,
    };

    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // Process new content or URL for the package update
    const packageKey = `${ID}`;
    if (Content) {
      const contentBuffer = Buffer.from(Content, "binary");
      if (contentBuffer.length === 0) {
        debug("The uploaded content is empty or invalid.");
        return res
          .status(400)
          .send("The uploaded content is empty or invalid.");
      }

      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: packageKey,
          Body: contentBuffer,
          ContentType: "application/zip",
        })
      );
    } else if (URL) {
      try {
        const packageData = await downloadPackageFromURL(URL);
        if (!packageData || packageData.length === 0) {
          return res
            .status(400)
            .send("Downloaded package is empty or invalid.");
        }

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: packageKey,
            Body: packageData,
            ContentType: "application/zip",
          })
        );
      } catch (err) {
        return res.status(500).send("Error downloading package from URL.");
      }
    }

    // Update the registry with the new package metadata
    const updatedPackageIndex = packageList.findIndex(
      (entry) => entry.ID === ID
    );
    if (updatedPackageIndex >= 0) {
      packageList[updatedPackageIndex] = {
        ...packageList[updatedPackageIndex],
        ...response_metadata,
      };
    }

    // Save the updated registry back to the JSON file
    fs.writeFileSync(
      "./registry.json",
      JSON.stringify(registry, null, 2),
      "utf8"
    );

    // Respond with the updated package information
    const response_data = {
      ...(Content !== undefined && { Content }),
      ...(URL !== undefined && { URL }),
      ...(JSProgram !== undefined && { JSProgram }),
    };

    res.status(200).json({
      response_metadata,
      response_data,
    });
  } catch (error) {
    console.error("Error handling /update package request:", error);
    res.status(500).send("An error occurred while updating the package.");
  }
};
