import express from "express";
import cors from "cors";
/*
import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
*/

const app = express();
app.use(cors());
const port = 8080;

/*
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
*/

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World.");
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

/*
const s3 = new AWS.S3({
  region: "us-east-1",
  // STILL NEED TO CONFIGURE AWS CREDENTIALS WITHIN THE PROJECT DO NOT APPROVE THIS PUSH YET
});

const BUCKET_NAME = "tpr-registry-storage";

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>Big moves from hello world</h1>
        <form action="/search" method="get">
          <label for="query">link or other entered here:</label>
          <input type="text" id="query" name="query" required>
          <button type="submit">Search</button>
        </form>
      </body>
    </html>
  `);
});

app.get("/search", async (req, res) => {
  const query = req.query.query as string;
  // local file
  const filePath = path.join(__dirname, "query.txt");
  fs.writeFileSync(filePath, `User input: ${query}`);

  try {
    // upload the file to S3
    const fileContent = fs.readFileSync(filePath);
    const params = {
      Bucket: BUCKET_NAME,
      Key: "query.txt", // name of the file in S3
      Body: fileContent,
      ContentType: "text/plain",
    };

    await s3.upload(params).promise();

    res.send(`Here's the search: ${query} (AND SAVED TO S3!!!!)`);
  } catch (error) {
    console.error("Error uploading to S3:", error);
    res.send("Failed to upload file to S3.");
  }
});
*/

// start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
