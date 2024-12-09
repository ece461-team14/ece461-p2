import * as fs from "fs";

export async function getUserDetails(username: string): Promise<{ permLevel: string; isAdmin: boolean } | null> {
  try {
    // Read the file contents
    const data = await fs.promises.readFile("users.csv", "utf-8");
    
    // Split the file into rows
    const rows = data.split("\n").filter(row => row.trim() !== "");
    
    // Extract the headers
    const headers = rows[0].split(",");
    
    // Find the index of the fields we care about
    const usernameIndex = headers.indexOf("username");
    const permLevelIndex = headers.indexOf("permLevel");
    const isAdminIndex = headers.indexOf("isAdmin");
    
    if (usernameIndex === -1 || permLevelIndex === -1 || isAdminIndex === -1) {
      throw new Error("Required fields are missing in the CSV file");
    }
    
    // Iterate through each row to find the user
    for (let i = 1; i < rows.length; i++) {
      const columns = rows[i].split(",");
      
      if (columns[usernameIndex] === username) {
        return {
          permLevel: columns[permLevelIndex],
          isAdmin: columns[isAdminIndex].trim().toLowerCase() === "true"
        };
      }
    }
    
    // Return null if the user is not found
    return null;
  } catch (error) {
    console.error("Error reading or processing the CSV file:", error);
    return null;
  }
}