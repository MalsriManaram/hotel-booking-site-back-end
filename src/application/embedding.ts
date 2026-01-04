import { Request, Response, NextFunction } from "express";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "@langchain/core/documents";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import mongoose from "mongoose";
import Hotel from "../infrastructure/schemas/Hotel";

export const createEmbeddings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Hugging Face Inference Embeddings
    const embeddingsModel = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });

    const vectorIndex = new MongoDBAtlasVectorSearch(
      embeddingsModel,
      {
        collection: mongoose.connection.db?.collection("hotelVectors") as any,
        indexName: "vector_index",
      }
    );

    const hotels = await Hotel.find({});

    const docs = hotels.map((hotel) => {
      const { _id, rating, location, price, description } = hotel;
      const doc = new Document({
        pageContent: `Hotel Rating: ${rating} .${description} Located in ${location}. Price per night: ${price}`,
        metadata: {
          _id,
        },
      });
      return doc;
    });

    await vectorIndex.addDocuments(docs);

    res.status(200).json({
      message: "Embeddings created successfully",
    });
  } catch (error) {
    next(error);
  }
};