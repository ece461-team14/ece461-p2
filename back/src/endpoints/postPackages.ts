import { Request, Response } from "express";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { validateAuthToken } from "../utils/authUtils.js";
import { fetchPackageMetadata } from "../utils/s3Utils.js";

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export const postPackages = async (req: Request, res: Response) => {
  try {
    // Validate the auth token
    const authToken = req.header("X-Authorization");
    if (!validateAuthToken(authToken)) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }

    const { body: queries } = req;
    if (!Array.isArray(queries) || queries.some((q) => typeof q !== "object")) {
      return res
        .status(400)
        .send("Invalid PackageQuery array in request body.");
    }

    const offset = parseInt(req.header("offset") || "0", 10);
    const bucketName = process.env.S3_BUCKET;

    if (!bucketName) {
      return res.status(500).send("S3 bucket name is not set.");
    }

    // List objects in the bucket
    const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      res.setHeader("offset", offset);
      return res.status(200).json([]);
    }

    // Fetch metadata
    const metadataList = await fetchPackageMetadata(
      listResponse.Contents,
      bucketName,
      s3Client
    );

    // Filter packages based on queries
    const filteredPackages = metadataList.filter((pkg) => {
      return queries.some((query) => {
        const nameMatches = query.name === "*" || pkg.Name === query.name;
        const versionMatches = query.version
          ? pkg.Version.VersionNumber === query.version
          : true;
        return nameMatches && versionMatches;
      });
    });

    // Enforce a limit on results
    if (filteredPackages.length > 1000) {
      return res.status(413).send("Too many packages returned.");
    }

    // Paginate results
    const paginatedPackages = filteredPackages.slice(offset, offset + 10);
    const nextOffset = offset + paginatedPackages.length;

    // Set offset header
    res.setHeader("offset", nextOffset);

    // Respond with filtered package data
    const response = paginatedPackages.map((pkg) => ({
      Name: pkg.Name,
      ID: pkg.ID,
      Version: pkg.Version,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error handling /packages request:", error);
    res.status(500).send("An error occurred while retrieving the packages.");
  }
};