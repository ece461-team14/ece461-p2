import express from "express";
import cors from "cors";
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

const app = express();
app.use(express.json());
app.use(cors());

// Endpoint for testing connectivity
// (probably remove/replace for final deliverable)
app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/packages", postPackages);
app.delete("/reset", deleteReset);
app.get("/package/:id", getPackageID);
app.post("/package/:id", postPackageID);
app.post("package", postPackage);
app.get("/package/:id/rate", getPackageIDRate);
app.get("/package/:id/cost", getPackageIDCost);
app.put("/authenticate", putAuthenticate);
app.post("/package/byRegEx", postPackageByRegEx);
app.get("/tracks", getTracks);

export default app;
