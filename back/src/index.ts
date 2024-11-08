import dotenv from "dotenv";
dotenv.config();
import express from "express";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Multer } from "multer";
import cors from "cors";
import path from "path";

// Set up the backend server
const app = express();
app.use(cors());
const port = 8080;
app.use(express.json());

// Set up the S3 client
const s3Client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// TODO: implement /packages endpoint
// (Get the packages from the registry.)
app.post("/packages", (req, res) => {});

// TODO: implement /reset endpoint
// (Reset the registry.)
app.delete("/reset", (req, res) => {});

// TODO: implement /package/{id} get endpoint
// (Interact with the package with this ID.)
app.get("/package/:id", (req, res) => {});

// TODO: implement /package/{id} post endpoint
// (Update the content of this package.)
app.post("/package/:id", (req, res) => {});

// TODO: implement /package endpoint
// (Upload or ingest a new package.)
app.post("/package", (req, res) => {});

// TODO: implement /package/{id}/rate
// (Get ratings for this package.)
app.get("/package/:id/rate", (req, res) => {});

// TODO: implement /package/{id}/cost
// /package/{id}/cost endpoint
// (Get the cost of this package.)
app.get("/package/:id/cost", (req, res) => {});

// TODO: implement /authenticate
//  endpoint
// (Create an access token.)
// (NON-BASELINE)
app.put("/authenticate", (req, res) => {});

// TODO: implement /package/byRegEx
// (Get any packages fitting the regular expression.)
app.post("/package/byRegEx", (req, res) => {});

// FIXME: take out the tracks we aren't doing
// (Get the list of tracks the team is implementing.)
app.get("/tracks", (req, res) => {
  try {
    const tracks = [
      "Performance track",
      "Access control track",
      "High assurance track",
      "ML inside track",
    ];
    res.json({ tracks });
  } catch (err) {
    res.status(500).json({
      error:
        "The system encountered an error while retrieving the student's track information.",
    });
  }
});

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
