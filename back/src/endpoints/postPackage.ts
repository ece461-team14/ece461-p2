import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const postPackage = async (req, res) => {
  try {
    // Extract token from the Authorization header (Bearer <token>)
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res.status(403).send("Authentication failed due to missing Authorization header.");
    }

    const token = authHeader.split(" ")[1]; // Extract token part
    if (!token) {
      return res.status(403).send("Token format is incorrect. Use 'Bearer <token>'");
    }

    // Verify the JWT token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).send("Authentication failed. Invalid or expired token.");
      }

      // Token is valid, decoded contains the payload (e.g., user info)
      // console.log("Token is valid. Decoded payload:", decoded);

      const { Name, Version, JSProgram, Content, URL } = req.body;

      // Validate the request body
      if (!Name || !Version || !JSProgram || (!Content && !URL)) {
        return res.status(400).send("There are missing field(s) in the PackageData or it is formed improperly (e.g., both Content and URL are set).");
      }

      // Generate a package ID based on the name (using SHA-256 hash for uniqueness)
      const packageID = crypto.createHash("sha256").update(Name).digest("hex");

      const bucketName = process.env.S3_BUCKET;
      if (!bucketName) {
        return res.status(500).send("S3 bucket name is not set.");
      }

      // Check if the package already exists
      const metadataKey = `${packageID}/metadata.json`;
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: metadataKey }));
        return res.status(409).send("Package already exists.");
      } catch (err) {
        if (err.name !== "NotFound") {
          console.error("Error checking package existence:", err);
          return res.status(500).send("Error checking package existence.");
        }
      }

      // Prepare package metadata
      const metadata = {
        Name,
        ID: packageID,
        Version: {
          VersionNumber: Version,
          UploadedBy: decoded.name, // Use the name from the JWT payload
          UploadedAt: new Date().toISOString(),
        },
      };

      // Upload metadata.json
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: metadataKey,
          Body: JSON.stringify(metadata, null, 2),
          ContentType: "application/json",
        })
      );

      // Upload the package content or ingest from URL
      const packageKey = `${packageID}/${Version}/package.zip`;
      if (Content) {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: packageKey,
            Body: Buffer.from(Content, "base64"),
            ContentType: "application/zip",
          })
        );
      } else if (URL) {
        // Download the package from the URL and upload it
        const isGithub = URL.includes("github.com");
        const isNPM = URL.includes("npmjs.com");

        if (isGithub) {
          // Download the package from GitHub
          const archiveURl = `${URL}/archive/refs/heads/main.zip`;
          try {
            const packageData = await axios.get(archiveURl, {
              responseType: "arraybuffer",
            });
            await s3Client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: packageKey,
                Body: packageData.data,
                ContentType: "application/zip",
              })
            );
          } catch (err) {
            console.error("Error downloading package from GitHub:", err);
            return res.status(500).send("Error downloading package from GitHub.");
          }
        } else if (isNPM) {
          // NPM-specific handling
          try {
            const packageName = URL.split("/").pop();
            const npmRegistryUrl = `https://registry.npmjs.org/${packageName}`;

            // Fetch the package metadata from the NPM registry
            const npmResponse = await axios.get(npmRegistryUrl);
            const tarballUrl = npmResponse.data["dist-tags"]?.latest
              ? npmResponse.data.versions[npmResponse.data["dist-tags"].latest]
                  .dist.tarball
              : null;

            if (!tarballUrl) {
              return res
                .status(400)
                .send("Unable to determine tarball URL for the specified NPM package.");
            }

            // Download the tarball
            const packageData = await axios.get(tarballUrl, {
              responseType: "arraybuffer",
            });
            await s3Client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: packageKey,
                Body: packageData.data,
                ContentType: "application/gzip",
              })
            );
          } catch (err) {
            console.error("Error downloading or uploading NPM package:", err);
            return res
              .status(500)
              .send("Error downloading or uploading the NPM package.");
          }
        } else {
          return res
            .status(400)
            .send("Unsupported URL format. Only GitHub and NPM URLs are supported.");
        }
      }

      // Respond with the package information
      res.status(201).json({
        message: "Package uploaded successfully",
        metadata,
        data: {
          JSProgram,
        },
      });
    });
  } catch (error) {
    console.error("Error handling /package request:", error);
    res.status(500).send("An error occurred while uploading or ingesting the package.");
  }
};
