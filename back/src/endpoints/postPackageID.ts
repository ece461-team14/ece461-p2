import {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

// TODO: implement /package/{id} post endpoint
export const postPackageID = async (req, res) => {
  try {
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN;
    const bucketName = process.env.S3_BUCKET;

    if (!authToken) {
      return res
        .status(403)
        .send("Authentication failed due to missing AuthenticationToken.");
    }

    if (authToken !== validToken) {
      return res
        .status(401)
        .send("You do not have permission to update this package.");
    }

    const packageId = req.params.id;
    const { Name, Version, Content, URL, JSProgram } = req.body;

    // Validation: Ensure required fields are present
    if (!Name || !Version || (!Content && !URL)) {
      return res.status(400).send("Missing required fields in request body.");
    }

    // Check if the package exists by checking the metadata
    const metadataKey = `${packageId}/metadata.json`;
    try {
      await s3Client.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: metadataKey })
      );
    } catch (err) {
      if (err.name === "NotFound") {
        return res.status(404).send("Package does not exist.");
      } else {
        console.error("Error checking package existence:", err);
        return res.status(500).send("Error checking package existence.");
      }
    }

    // Update the package version
    const newVersionKey = `${packageId}/${Version}/package.zip`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: newVersionKey,
        Body: Buffer.from(Content, "base64"), // Assuming content is base64 encoded
        ContentType: "application/zip",
      })
    );

    // Update metadata with the new version
    const metadata = {
      Name,
      Version,
      ID: packageId,
      UpdatedAt: new Date().toISOString(),
    };

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: metadataKey,
        Body: JSON.stringify(metadata),
        ContentType: "application/json",
      })
    );

    // Return the updated package info
    res.status(200).json({
      metadata,
      data: {
        Content: Content,
        URL: URL,
        JSProgram,
      },
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).send("An error occurred while updating the package.");
  }
};
