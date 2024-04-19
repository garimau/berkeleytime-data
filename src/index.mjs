import express from "express";
import query from "./lib/query.js";

const app = express();

app.get("/query", async (request, response) => {
  const { input } = request.query;

  if (!input || typeof input !== "string") return response.status(400).end();

  const result = await query(input, 10);

  response.json(result);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}.`);
});
