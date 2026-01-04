"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieve = void 0;
const Hotel_1 = __importDefault(require("../infrastructure/schemas/Hotel"));
const mongoose_1 = __importDefault(require("mongoose"));
const hf_1 = require("@langchain/community/embeddings/hf");
const mongodb_1 = require("@langchain/mongodb");
const retrieve = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { description, rating, location, price } = req.query;
        console.log("Retrieve called with:", { description, rating, location, price });
        // if query is empty, return all hotels
        if ((!description || description === "") &&
            (!rating || rating === "") &&
            (!location || location === "") &&
            (!price || price === "")) {
            const hotels = (yield Hotel_1.default.find()).map((hotel) => ({
                hotel: hotel,
                confidence: 1,
            }));
            res.status(200).json(hotels);
            return;
        }
        // Construct a combined query string
        const query = `Hotel Rating: ${rating || "N/A"}, Description: ${description || "N/A"}, Location: ${location || "N/A"}, Price: ${price || "N/A"}`;
        // Use Hugging Face Inference Embeddings
        const embeddingsModel = new hf_1.HuggingFaceInferenceEmbeddings({
            model: "sentence-transformers/all-MiniLM-L6-v2",
            apiKey: process.env.HUGGINGFACE_API_KEY,
        });
        // Create vector index
        const vectorIndex = new mongodb_1.MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: (_a = mongoose_1.default.connection.db) === null || _a === void 0 ? void 0 : _a.collection("hotelVectors"),
            indexName: "vector_index",
        });
        // Search for the query
        const results = yield vectorIndex.similaritySearchWithScore(query);
        console.log(results);
        const matchedHotels = yield Promise.all(results.map((result) => __awaiter(void 0, void 0, void 0, function* () {
            const hotel = yield Hotel_1.default.findById(result[0].metadata._id);
            return {
                hotel: hotel,
                confidence: result[1],
            };
        })));
        res
            .status(200)
            .json(matchedHotels.length > 3 ? matchedHotels.slice(0, 4) : matchedHotels);
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.retrieve = retrieve;
