import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import semver from "semver";

const registryFilePath = path.resolve("./registry.json");

export const postPackages = async (req: Request, res: Response) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Token payload:", decoded);

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(403)
        .send("Authentication failed due to invalid token.");
    }

    // Parse the request body
    const queries = req.body;
    if (!Array.isArray(queries) || queries.some((q) => typeof q !== "object")) {
      return res
        .status(400)
        .send("Invalid PackageQuery array in request body.");
    }

    const offset = parseInt(req.header("offset") || "0", 10);

    // Load registry data from local file
    let registryData;
    try {
      const registryContent = fs.readFileSync(registryFilePath, "utf-8");
      registryData = JSON.parse(registryContent);
    } catch (error) {
      console.error("Error reading registry file:", error);
      return res.status(500).send("Failed to load registry data.");
    }

    // Filter packages based on queries, including version handling
    const filteredPackages = Object.entries(registryData).flatMap(
      ([name, versions]) => {
        return (versions as any[]).filter((pkg) => {
          return queries.some((query) => {
            // if query.name is "*", it matches all names
            // otherwise it must match the package name
            const nameMatches = query.Name === "*" || query.Name === name;

            // Handle version matching with semver
            const versionMatches = query.version
              ? semver.satisfies(pkg.Version, query.version)
              : true;

            return nameMatches && versionMatches;
          });
        });
      }
    );

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
