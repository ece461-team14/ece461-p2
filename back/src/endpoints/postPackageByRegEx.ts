import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const postPackageByRegEx = async (req, res) => {
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
        .send("You do not have permission to access this registry.");
    }

    const { RegEx } = req.body;

    // Validate the request body
    if (!RegEx || typeof RegEx !== "string") {
      return res
        .status(400)
        .send("The request is missing a valid RegEx field.");
    }

    // Compile the regex
    let regex;
    try {
      regex = new RegExp(RegEx);
    } catch (error) {
      return res.status(400).send("The provided RegEx is invalid.");
    }

    // List objects in the bucket
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      return res.status(404).send("No packages available in the registry.");
    }

    // Filter metadata files
    const metadataKeys = listResponse.Contents.filter((object) =>
      object.Key.endsWith("metadata.json")
    ).map((object) => object.Key);

    if (metadataKeys.length === 0) {
      return res.status(404).send("No packages available for search.");
    }

    // Search using RegEx
    const matchedPackages = [];
    for (const key of metadataKeys) {
      try {
        const metadataResponse = await s3Client.send(
          new GetObjectCommand({ Bucket: bucketName, Key: key })
        );
        const metadataBody = await metadataResponse.Body.transformToString();
        const metadata = JSON.parse(metadataBody);

        // Check if package matches the RegEx
        if (
          regex.test(metadata.Name) ||
          (metadata.Description && regex.test(metadata.Description))
        ) {
          matchedPackages.push({
            Name: metadata.Name,
            Version: metadata.Version,
            ID: metadata.ID,
          });
        }
      } catch (err) {
        console.error(`Error retrieving or parsing metadata for ${key}:`, err);
        // Continue to the next package
      }
    }

    if (matchedPackages.length === 0) {
      return res.status(404).send("No package found under this regex.");
    }

    // Return the matched packages
    res.status(200).json(matchedPackages);
  } catch (error) {
    console.error("Error processing /package/byRegEx request:", error);
    res.status(500).send("An error occurred while searching packages.");
  }
};
