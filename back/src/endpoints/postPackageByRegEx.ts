import jwt from "jsonwebtoken";
import fs from "fs";
import RE2 from "re2";
import { S3Client } from "@aws-sdk/client-s3";
import { getUserDetails } from "../utils/userPerms.js";

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bucketName = process.env.S3_BUCKET;

export const postPackageByRegEx = async (req, res) => {
  try {
    // Validate the JWT from the Authorization header
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing Authorization header."
        );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing Authorization header."
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
    const username = decoded.name;

    const { RegEx } = req.body;

    // Validate the request body
    if (!RegEx || typeof RegEx !== "string") {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
        );
    }

    // Compile the regex
    let regex;
    try {
      regex = new RE2(RegEx, "i");
    } catch (error) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the PackageRegEx or it is formed improperly, or is invalid"
        );
    }

    // List objects in the bucket
    const { permLevel, isAdmin } = await getUserDetails(username);
    const fileContent = fs.readFileSync("./registry.json", "utf8");
    const registry = JSON.parse(fileContent); // Parse the JSON content into an object
    let matchedPackages = [];

    for (const name of Object.keys(registry)) {
      if (regex.test(name)) {
        registry[name].forEach((pkg) => {
          if (pkg.PermLevel <= permLevel) {
            matchedPackages.push({
              Version: pkg.Version,
              Name: pkg.Name,
              ID: pkg.ID,
            });
          }
          console.log(pkg);
        });
      }
    }

    if (matchedPackages.length === 0) {
      return res.status(404).send("No package found under this regex.");
    }

    // Return the matched packages
    return res.status(200).json(matchedPackages);
  } catch (error) {
    console.error("Error processing /package/byRegEx request:", error);
    res.status(500).send("An error occurred while searching packages.");
  }
};
