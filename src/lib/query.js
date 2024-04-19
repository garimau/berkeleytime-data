import { Pinecone } from "@pinecone-database/pinecone";
import { pipeline } from "@xenova/transformers";

const pipe = await pipeline("embeddings", "Xenova/all-MiniLM-L6-v2");

const query = async (query, topK) => {
  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

    const embedding = await pipe(query, {
      pooling: "mean",
      normalize: true,
    });

    const result = await index.query({
      vector: Array.from(embedding.data),
      topK,
      includeValues: false,
    });

    return result;
  } catch (error) {
    return null;
  }
};

export default query;
