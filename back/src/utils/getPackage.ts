import { info, debug, silent } from "./logger.js";

/**
 * Given a package URL, returns contents as Base64-encoded string
 * This function assumes that the URL is valid, it does not do any checking
 * @param url URL of package
 * @returns Base64-encoded string of repo contents
 */
export async function getPackage(url: string): Promise<string> {
  const githubToken = process.env.GITHUB_TOKEN;

  try {
    // Fetch the contents from the provided URL
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${githubToken}`,
      },
    });

    // Check if the response is successful
    if (!response.ok) {
      await info(
        `Error processing ${url}: Invalid Response ${response.statusText}`
      );
      throw new Error(`Failed to fetch package: ${response.statusText}`);
    }

    // Read the response as a Buffer
    const data = await response.arrayBuffer();
    const buffer = Buffer.from(data);

    // Convert the Buffer to a Base64-encoded string
    const base64String = buffer.toString("base64");

    return base64String;
  } catch (err) {
    await info(`Error processing ${url}: ${err.message}`);
    throw err;
  }
}
