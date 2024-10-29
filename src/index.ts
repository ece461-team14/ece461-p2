import express from "express";

const app = express();
const port = 3000;

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

app.get("/search", (req, res) => {
  const query = req.query.query as string;
  res.send(`here's the search: ${query}`);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
