"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieve = void 0;
const Hotel_1 = __importDefault(require("../infrastructure/schemas/Hotel"));
const openai_1 = require("@langchain/openai");
const mongodb_1 = require("@langchain/mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
const retrieve = async (req, res, next) => {
    try {
        const { description, rating, location, price } = req.query;
        // if query is empty, return all hotels
        if (!description || description === "" && !rating || rating === "" && !location || location === "" && !price || price === "") {
            const hotels = (await Hotel_1.default.find()).map((hotel) => ({
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
        const embeddingsModel = new openai_1.OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Connect to MongoDB Vector Search
        const vectorIndex = new mongodb_1.MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: mongoose_1.default.connection.collection("hotelVectors"),
            indexName: "vector_index",
        });
        // Perform similarity search using the combined query string
        const results = await vectorIndex.similaritySearchWithScore(query);
        console.log(results);
        // Fetch matching hotels from MongoDB
        const matchedHotels = await Promise.all(results.map(async (result) => {
            const hotel = await Hotel_1.default.findById(result[0].metadata._id);
            return {
                hotel: hotel,
                confidence: result[1],
            };
        }));
        // Check if matchedHotels array is empty
        if (matchedHotels.length === 0) {
            res.status(204).send();
            return;
        }
        res.status(200).json(matchedHotels.length > 3 ? matchedHotels.slice(0, 4) : matchedHotels);
        return;
    }
    catch (error) {
        next(error);
    }
};
exports.retrieve = retrieve;
