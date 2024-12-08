import { info, debug, silent } from "./logger.js";
import axios from "axios";
import AdmZip from "adm-zip";

export async function downloadPackageFromURL(url) {
  try {
    // Check if the URL is a GitHub repository URL
    if (url.includes("github.com")) {
      // Parse the GitHub URL to get the repository details
      const githubUrl = new URL(url);
      const parts = githubUrl.pathname.split("/").filter(Boolean);

      if (parts.length < 2) {
        throw new Error("Invalid GitHub URL.");
      }

      const username = parts[0];
      const repoName = parts[1];

      // Use GitHub API to get repository details
      const apiUrl = `https://api.github.com/repos/${username}/${repoName}`;
      const repoDetailsResponse = await axios.get(apiUrl);

      // Extract the default branch from the API response
      const defaultBranch = repoDetailsResponse.data.default_branch;

      // Construct the URL for downloading the ZIP file of the default branch
      const githubZipUrl = `https://github.com/${username}/${repoName}/archive/refs/heads/${defaultBranch}.zip`;

      // Fetch the ZIP file from GitHub
      const response = await axios.get(githubZipUrl, {
        responseType: "arraybuffer",
      });

      return response.data;
    } else if (url.includes("npmjs.org")) {
      // Parse the npm package name from the URL
      const npmPackageName = url.split("/").pop();

      // Construct the npm package metadata API URL
      const npmUrl = `https://registry.npmjs.org/${npmPackageName}/latest`;

      // Fetch the npm package metadata
      const response = await axios.get(npmUrl);

      if (response.data && response.data.dist && response.data.dist.tarball) {
        // Get the tarball URL for the latest version of the package
        const tarballUrl = response.data.dist.tarball;

        // Download the tarball package
        const packageResponse = await axios.get(tarballUrl, {
          responseType: "arraybuffer",
        });
        return packageResponse.data;
      } else {
        console.error("No tarball found for npm package.");
        return null;
      }
    } else {
      console.error("Unsupported URL format.");
      return null;
    }
  } catch (error) {
    console.error("Error downloading package:", error);
    return null;
  }
}

/**
 * Extracts the `package.json` from a base64-encoded zip file.
 * @param base64Zip The base64-encoded zip file string.
 * @returns The parsed JSON content of `package.json` if found, or `null`.
 */
export async function extractRepoURL(
  base64Zip: string
): Promise<string | null> {
  try {
    // Step 1: Decode the Base64 string
    const zipBuffer = Buffer.from(base64Zip, "base64");

    // Step 2: Parse the zip file
    const zip = new AdmZip(zipBuffer);

    // Step 3: Search for `package.json` in any directory
    const packageJsonEntry = zip
      .getEntries()
      .find((entry) => entry.entryName.endsWith("package.json"));
    if (!packageJsonEntry) {
      console.error("package.json not found in the zip file.");
      return null;
    }

    // Step 4: Read and parse `package.json`
    const packageJsonContent = packageJsonEntry.getData().toString("utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Step 5: Extract the repository URL
    let repositoryUrl: string | null = null;

    // Check for the `repository` field
    if (typeof packageJson.repository === "string") {
      repositoryUrl = packageJson.repository;
    } else if (
      typeof packageJson.repository === "object" &&
      typeof packageJson.repository.url === "string"
    ) {
      repositoryUrl = packageJson.repository.url;
    }
    // console.log(packageJson.repository.url);

    // Check for the top-level `url` field as a fallback
    if (!repositoryUrl && typeof packageJson.url === "string") {
      repositoryUrl = packageJson.url;
    }

    // Trim and clean up the URL
    if (repositoryUrl) {
      const match = repositoryUrl.match(/https:\/\/.+/);
      repositoryUrl = match ? match[0].trim() : null;

      // Remove `.git` at the end, if present
      if (repositoryUrl && repositoryUrl.endsWith(".git")) {
        repositoryUrl = repositoryUrl.slice(0, -4);
      }
    }

    return repositoryUrl;
  } catch (error) {
    console.error("Error extracting package.json:", error);
    return null;
  }
}
