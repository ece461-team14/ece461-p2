import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import * as fs from "fs";
import { getUserDetails } from "../utils/userPerms.js";
import { idExists, getObjFromId } from "../utils/idReg.js";
dotenv.config();

export const getPackageIDHistory = async (req, res) => {
  try {
    const packageId = req.params.id;

    // Extract token from the Authorization header (Bearer <token>)
    const authHeader = req.header("X-Authorization");
    if (!authHeader) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer "
    if (!token) {
      return res
        .status(403)
        .send("Token format is incorrect. Use 'Bearer <token>'");
    }

    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res
        .status(403)
        .send(
          "Authentication failed due to invalid or missing AuthenticationToken."
        );
    }

    const username = decoded.name;
    const registry = JSON.parse(fs.readFileSync("registry.json", "utf-8"));

    try {
      // check if package ID exists in regCache
      if (!idExists(registry, packageId)) {
        return res.status(404).send("Package does not exist.");
      }
    } catch (err) {
      console.error("Error checking package existence:", err);
      return res.status(500).send("Error retrieving package metadata.");
    }

    const packageMetadata = getObjFromId(registry, packageId);
    const { permLevel, isAdmin } = await getUserDetails(username);
    if (packageMetadata.PermLevel > permLevel) {
      console.error("User does not have permission to view this package.");
      return res.status(403).send("User does not have permission to view this package.");
    }

    if (!packageMetadata.DownloadHistory) {
      packageMetadata.DownloadHistory = [];
    }

    // Send response with metadata and content
    res.status(200).json(packageMetadata.DownloadHistory);
  } catch (error) {
    console.error("Error handling /package/:id/history request:", error);
    res.status(500).send("An error occurred while retrieving download history.");
  }
};