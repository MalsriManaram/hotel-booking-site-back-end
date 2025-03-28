import { Request, Response, NextFunction } from 'express';
import Hotel from '../infrastructure/schemas/Hotel';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import mongoose from 'mongoose';

export const retrieve = async (req: Request, res: Response, next: NextFunction) => {
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
        const query = [
            description || "",
            rating ? `Rating: ${rating}` : "",
            location ? `Location: ${location}` : "",
            price ? `Price: ${price}` : "",
        ]
        .filter(Boolean)  
        .join(" | ");


        // Initialize OpenAI embeddings model
        const embeddingsModel = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            apiKey: process.env.OPENAI_API_KEY,
        });

        // Connect to MongoDB Vector Search
        const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: mongoose.connection.collection("hotelVectors"),
            indexName: "vector_index",
        });

        // Perform similarity search using the combined query string
        const results = await vectorIndex.similaritySearchWithScore(query);

        console.log(results);

        // Fetch matching hotels from MongoDB
        const matchedHotels = await Promise.all(
            results.map(async (result) => {
                const hotel = await Hotel.findById(result[0].metadata._id);
                return {
                    hotel: hotel,
                    confidence: result[1],
                };
            })
        );

        // Check if matchedHotels array is empty
        if (matchedHotels.length === 0) {
             res.status(204).send();
             return;
        }

        res.status(200).json(matchedHotels.length > 3 ? matchedHotels.slice(0, 4) : matchedHotels);
        return;
        
    } catch (error) {
        next(error);
    }
};
