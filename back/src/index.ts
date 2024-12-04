import app from "./app.js";
import dotenv from "dotenv";
dotenv.config();
const port = 8080;

app.listen(port, () => {
  console.log(`server running on http://localhost:${port}`);
});
