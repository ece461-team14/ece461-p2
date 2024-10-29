import express from "express";

const app = express();
const port = 3000;

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World.");
});

// TODO: implement this endpoint
// /packages endpoint
// (Get the packages from the registry.)
app.post("/packages", (req, res) => {});

// TODO: implement this endpoint
// /reset endpoint
// (Reset the registry.)
app.delete("/reset", (req, res) => {});

// TODO: implement this endpoint
// /package/{id} get endpoint (interacts with package)
// (Interact with the package with this ID.)
app.get("/package/:id", (req, res) => {});

// TODO: implement this endpoint
// /package/{id} post endpoint (updates package)
// (Update this content of the package.)
app.post("/package/:id", (req, res) => {});

// TODO: implement this endpoint
// /package endpoint
// (Upload or ingest a new package.)
app.post("/package", (req, res) => {});

// TODO: implement this endpoint
// /package/{id}/rate endpoint
// (Get ratings for this package.)
app.get("/package/:id/rate", (req, res) => {});

// TODO: implement this endpoint
// /package/{id}/cost endpoint
// (Get the cost of this package.)
app.get("/package/:id/cost", (req, res) => {});

// TODO: implement this endpoint
// /authenticate endpoint
// (Create an access token.)
// (NON-BASELINE)
app.put("/authenticate", (req, res) => {});

// TODO: implement this endpoint
// /package/byRegEx endpoint
// (Get any packages fitting the regular expression.)
app.post("/package/byRegEx", (req, res) => {});

// FIXME: take out the tracks we aren't doing
// /tracks endpoint
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
