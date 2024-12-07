import express from "express";
import cors from "cors";
import path from "path";
import { info, debug, silent } from "./utils/logger.js";
import { postPackages } from "./endpoints/postPackages.js";
import { deleteReset } from "./endpoints/deleteReset.js";
import { getPackageID } from "./endpoints/getPackageID.js";
import { postPackageID } from "./endpoints/postPackageID.js";
import { postPackage } from "./endpoints/postPackage.js";
import { getPackageIDRate } from "./endpoints/getPackageIDRate.js";
import { getPackageIDCost } from "./endpoints/getPackageIDCost.js";
import { putAuthenticate } from "./endpoints/putAuthenticate.js";
import { postPackageByRegEx } from "./endpoints/postPackageByRegEx.js";
import { getTracks } from "./endpoints/getTracks.js";
import { postUsers } from "./endpoints/postUsers.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000", // for only front end allowed to make requests
  })
);
app.use(express.json());

const USERS_FILE = path.resolve("ece461-p2/users.csv");

// Endpoint for testing connectivity
// (probably remove/replace for final deliverable)
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = 100000; // 100 seconds in milliseconds
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      console.log("Request timed out");
      res.status(503).send({ error: "Request timed out" });
    }
  }, timeout);

  // Clear timeout if response finishes before the limit
  res.on("finish", () => clearTimeout(timer));
  next();
});

app.post("/packages", postPackages);
app.delete("/reset", deleteReset);
app.get("/package/:id", getPackageID);
app.post("/package/:id", postPackageID);
app.post("/package", postPackage);
app.get("/package/:id/rate", getPackageIDRate);
app.get("/package/:id/cost", getPackageIDCost);
app.put("/authenticate", putAuthenticate);
app.post("/package/byRegEx", postPackageByRegEx);
app.get("/tracks", getTracks);
app.post("/users", postUsers);

export default app;
