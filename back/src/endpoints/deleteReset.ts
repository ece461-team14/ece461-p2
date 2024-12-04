import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const deleteReset = async (req, res) => {
  try {
    // Verify X-Authorization header
    const authToken = req.header("X-Authorization");
    const validToken = process.env.AUTH_TOKEN; // get the valid auth token from the environment
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
        .send("You do not have permission to reset the registry.");
    }

    // Get bucket name from environment variables
    const bucketName = process.env.S3_BUCKET;
    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // List all the objects in the bucket
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents;

    if (objects && objects.length > 0) {
      const deletePromises = objects.map((object) => {
        const deleteParams = {
          Bucket: bucketName,
          Key: object.Key,
        };
        return s3Client.send(new DeleteObjectCommand(deleteParams));
      });
      await Promise.all(deletePromises);
    }

    res.status(200).send("Registry is reset.");
  } catch (error) {
    console.error("Error resetting registry:", error);
    res.status(500).send("Error resetting registry.");
  }
};
