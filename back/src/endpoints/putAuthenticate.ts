import fs from "fs/promises";
import jwt from "jsonwebtoken";
import {
  User,
  AuthenticationRequest,
  AuthenticationToken,
} from "../types/GitHubFile.js";

const USERS_FILE = "./users.json";
const JWT_SECRET = process.env.JWT_SECRET;

export const putAuthenticate = async (req, res) => {
  try {
    const body: AuthenticationRequest = req.body;

    // Validate request body
    if (
      !body ||
      !body.User ||
      !body.Secret ||
      !body.User.name ||
      !body.Secret.password
    ) {
      return res
        .status(400)
        .send(
          "There is missing field(s) in the AuthenticationRequest or it is formed improperly."
        );
    }

    const { name } = body.User;
    const { password } = body.Secret;

    // Read the users file
    const userFileData = await fs.readFile(USERS_FILE, "utf-8");
    const users = userFileData
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line)
      .map((line) => {
        const [storedName, storedPassword, permLevel] = line.split(",");
        return {
          name: storedName,
          password: storedPassword,
          perm_level: parseInt(permLevel, 10),
        };
      }) as User[];

    // Check user credentials
    const user = users.find((u) => u.name === name && u.password === password);

    if (!user) {
      return res.status(401).send("The user or password is invalid.");
    }

    // Generate JWT token
    const tokenPayload = {
      name: user.name,
      perm_level: user.perm_level,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1h" });

    // Return the token
    const response: AuthenticationToken = { token: `bearer ${token}` };
    return res.status(200).json(response);
  } catch (err) {
    console.error("Error handling /authenticate request:", err);
    return res.status(501).send("This system does not support authentication.");
  }
};
