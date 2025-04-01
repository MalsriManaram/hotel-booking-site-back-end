import { Request, Response, NextFunction } from "express";
import Hotel from "../infrastructure/schemas/Hotel";
import mongoose from "mongoose";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

export const retrieve = async ( req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, rating, location, price } = req.query;

    // if query is empty, return all hotels
    if (!description || description === "" && !rating || rating === "" && !location || location === "" && !price || price === "") {
        const hotels = (await Hotel.find()).map((hotel) => ({
            hotel: hotel,
            confidence: 1,
        }));
        res.status(200).json(hotels);
        return;
    }

    // Construct a combined query string
    const query = `Hotel Rating: ${rating || "N/A"}, Description: ${description || "N/A"}, Location: ${location || "N/A"}, Price: ${price || "N/A"}`;
    

    // Create embeddings model
    const embeddingsModel = new OpenAIEmbeddings({
      model: "text-embedding-ada-002",
      apiKey: process.env.OPENAI_API_KEY,
    });

    /// Create vector index 
    const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
      collection: mongoose.connection.collection("hotelVectors"),
      indexName: "vector_index",
    });

    // Search for the query
    const results = await vectorIndex.similaritySearchWithScore(query as string);

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

    res.status(200).json( matchedHotels.length > 3 ? matchedHotels.slice(0, 4) : matchedHotels);
    return;

  } catch (error) {
    next(error);
  }
};