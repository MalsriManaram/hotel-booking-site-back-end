import { Request, Response, NextFunction } from "express";
import Hotel from "../infrastructure/schemas/Hotel";
import mongoose from "mongoose";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";


if(!process.env.HUGGINGFACE_API_KEY){
  throw new Error("HUGGINGFACE_API_KEY is not defined in environment variables");
}


export const retrieve = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { description, rating, location, price } = req.query;

    console.log("Retrieve called with:", { description, rating, location, price });

    // if query is empty, return all hotels
    if (
      (!description || description === "") &&
      (!rating || rating === "") &&
      (!location || location === "") &&
      (!price || price === "")
    ) {
      const hotels = (await Hotel.find()).map((hotel) => ({
        hotel: hotel,
        confidence: 1,
      }));
      res.status(200).json(hotels);
      return;
    }

    // Construct a combined query string
    const query = `Hotel Rating: ${rating || "N/A"}, Description: ${
      description || "N/A"
    }, Location: ${location || "N/A"}, Price: ${price || "N/A"}`;

    // Use Hugging Face Inference Embeddings
    const embeddingsModel = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });

    // Create vector index
    const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
      collection: mongoose.connection.db?.collection("hotelVectors") as any,
      indexName: "vector_index",
    });

    // Search for the query
    const results = await vectorIndex.similaritySearchWithScore(
      query as string
    );

    console.log(results);

    const matchedHotels = await Promise.all(
      results.map(async (result) => {
        const hotel = await Hotel.findById(result[0].metadata._id);
        return {
          hotel: hotel,
          confidence: result[1],
        };
      })
    );

    res
      .status(200)
      .json(
        matchedHotels.length > 3 ? matchedHotels.slice(0, 4) : matchedHotels
      );
    return;
  } catch (error) {
    next(error);
  }
};
