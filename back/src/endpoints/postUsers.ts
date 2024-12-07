import fs from "fs";
import path from "path";
import { Request, Response } from "express";

const USERS_FILE = path.resolve(process.cwd(), 'users.csv');

// Function to write a new user to the users.csv file
const writeUser = (username: string, password: string): void => {
  const newUser = `${username},${password},1,false\n`;
  console.log('Writing to:', USERS_FILE);

  // Check if file exists, if not, create it with the header row
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, "username,password,type,isDeleted\n");
  }

  // Append the new user data to the file
  fs.appendFileSync(USERS_FILE, newUser, "utf8");
};

// POST handler for creating a new user
export const postUsers = (req: Request, res: Response) => {
  console.log("Received request to add user:", req.body);

  // Destructure the username and password from the request body
  const { username, password } = req.body;

  // Validate input: both username and password are required
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  // Optionally, you could add more validation like checking if the user already exists.
  // For now, we assume that the username is unique (you could enhance this further).

  try {
    // Call the writeUser function to append the new user data
    writeUser(username, password);

    // Log success for debugging
    console.log(`User ${username} successfully written to file.`);

    // Respond with a success message
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    // Log the error for debugging purposes
    console.error(`Error writing user: ${error.message}`);

    // Respond with a server error status
    res.status(500).json({ error: "Internal server error." });
  }
};
