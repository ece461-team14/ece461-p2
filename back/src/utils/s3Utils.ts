import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

interface PackageMetadata {
  Name: string;
  ID: string;
  Version: {
    VersionNumber: string;
  };
}

export const fetchPackageMetadata = async (
  s3Objects: { Key?: string }[],
  bucketName: string,
  s3Client: S3Client
): Promise<PackageMetadata[]> => {
  const metadataPromises = s3Objects
    .filter((object) => object.Key?.endsWith("metadata.json"))
    .map(async (object) => {
      try {
        const metadataResponse = await s3Client.send(
          new GetObjectCommand({ Bucket: bucketName, Key: object.Key! })
        );
        const metadataBody = await metadataResponse.Body?.transformToString();
        return JSON.parse(metadataBody!);
      } catch (err) {
        console.error(`Error retrieving metadata for ${object.Key}:`, err);
        return null;
      }
    });

  return (await Promise.all(metadataPromises)).filter(
    Boolean
  ) as PackageMetadata[];
};
