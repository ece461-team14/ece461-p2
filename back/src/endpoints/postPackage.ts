import axios from "axios";
import crypto from "crypto";
import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const postPackage = async (req, res) => {
  try {
    // Verify the X-Authorization header
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN; // Get the valid auth token from the environment
    if (!authToken) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }
    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to upload or ingest packages.");
    }

    const { Name, Version, JSProgram, Content, URL } = req.body;

    // Validate the request body
    if (!Name || !Version || !JSProgram || (!Content && !URL)) {
      return res
        .status(400)
        .send(
          "There are missing field(s) in the PackageData or it is formed improperly (e.g., both Content and URL are set)."
        );
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
      await s3Client.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
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
        UploadedBy: authToken,
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
        // download the package from github
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
          // Extract the package name from the URL
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
              .send(
                "Unable to determine tarball URL for the specified NPM package."
              );
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
          .send(
            "Unsupported URL format. Only GitHub and NPM URLs are supported."
          );
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
  } catch (error) {
    console.error("Error handling /package request:", error);
    res
      .status(500)
      .send("An error occurred while uploading or ingesting the package.");
  }
};
