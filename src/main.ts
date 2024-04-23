import express, { Request, Response } from "express";
import cors from "cors";
import query from "./lib/query.js";

const DEFAULT_TOPK = 3;

const app = express();

app.use(cors());

app.get("/query", async (request: Request, response: Response) => {
  const { input, topK } = request.query;

  // Require input
  if (!input || typeof input !== "string") return response.status(400).end();

  const result = await query(
    input,
    // Parse topK as integer or use default
    typeof topK === "string" ? parseInt(topK) || DEFAULT_TOPK : DEFAULT_TOPK
  );

  response.json(result);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}.`);
});
