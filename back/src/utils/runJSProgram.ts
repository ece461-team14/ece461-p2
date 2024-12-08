import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";

export async function executeJsOnZip(
  base64Zip: string,
  jsProgram: string,
  metadata: any,
  user: any
): Promise<any> {
  console.log('RUNNING JS PROGRAM');
  return new Promise(async (resolve, reject) => {
    const tmpDir = path.join(process.cwd(), "tmp");
    const zipFilePath = path.join(tmpDir, "temp.zip");
    const jsFilePath = path.join(tmpDir, "temp.js");

    try {
      // Ensure temporary directory exists
      await fs.mkdir(tmpDir, { recursive: true });

      // Decode the base64 zip file and write it to the temp directory
      const zipBuffer = Buffer.from(base64Zip, "base64");
      await fs.writeFile(zipFilePath, zipBuffer);

      // Write the JavaScript program to a temporary file
      await fs.writeFile(jsFilePath, jsProgram);

      // Execute the JavaScript program with Node.js
      exec(`node ${jsFilePath} ${metadata.Name} ${metadata.Version} ${metadata.UsernameUploaded} ${user} ${zipFilePath}`, (error, stdout, stderr) => {
        const exitCode = error ? error.code : 0;
        console.log(stdout);

        // Cleanup: Delete temporary files
        Promise.all([fs.unlink(zipFilePath), fs.unlink(jsFilePath)])
          .then(() => resolve(exitCode))
          .catch((cleanupError) =>
            reject(
              `Error during cleanup: ${cleanupError}. Original Exit Code: ${exitCode}`
            )
          );
      });
    } catch (error) {
      reject(`Error during execution: ${error}`);
    }
  });
}