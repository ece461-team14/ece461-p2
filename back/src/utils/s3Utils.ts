import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import Readable from "stream";
dotenv.config();

const s3Client = new S3Client({ region: process.env.AWS_REGION });

/**
 * Converts a stream into a Buffer.
 *
 * @param stream - The readable stream to convert.
 * @returns A Promise that resolves to a Buffer.
 */
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Fetches a zip file from an S3 bucket by its ID (name) and returns it.
 *
 * @param bucketName - The name of the S3 bucket.
 * @param fileId - The name of the zip file in the S3 bucket.
 * @returns A Promise that resolves to the file as a Buffer.
 */
export async function getPackageFromID(
  bucketName: string,
  fileId: string
): Promise<Buffer> {
  try {
    // Define the parameters for the S3 getObject call
    const params = {
      Bucket: bucketName,
      Key: fileId,
    };

    // Fetch the file from S3
    const data = await s3Client.send(new GetObjectCommand(params));

    if (!data.Body) {
      throw new Error(
        `File with ID '${fileId}' not found in bucket '${bucketName}'.`
      );
    }

    // Handle case where Body is a stream
    if (data.Body instanceof Buffer) {
      return data.Body;
    } else if (data.Body instanceof Readable) {
      return await streamToBuffer(data.Body as NodeJS.ReadableStream);
    } else {
      throw new Error(`Unexpected data.Body type: ${typeof data.Body}`);
    }
  } catch (error) {
    console.error(`Error fetching file from S3: ${error.message}`);
    throw error;
  }
}

/**
 * Converts a Buffer to its Base64 representation without intermediate string conversion.
 *
 * @param buffer - The Buffer to convert.
 * @returns The Base64 encoded string.
 */
export function convertToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}
