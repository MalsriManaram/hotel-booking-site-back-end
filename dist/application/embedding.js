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
exports.createEmbeddings = void 0;
const openai_1 = require("@langchain/openai");
const documents_1 = require("@langchain/core/documents");
const mongodb_1 = require("@langchain/mongodb");
const mongoose_1 = __importDefault(require("mongoose"));
const Hotel_1 = __importDefault(require("../infrastructure/schemas/Hotel"));
const createEmbeddings = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const embeddingsModel = new openai_1.OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            apiKey: process.env.OPENAI_API_KEY,
        });
        const vectorIndex = new mongodb_1.MongoDBAtlasVectorSearch(embeddingsModel, {
            collection: mongoose_1.default.connection.collection("hotelVectors"),
            indexName: "vector_index",
        });
        const hotels = yield Hotel_1.default.find({});
        const docs = hotels.map((hotel) => {
            const { _id, location, price, description } = hotel;
            const doc = new documents_1.Document({
                pageContent: `${description} Located in ${location}. Price per night: ${price}`,
                metadata: {
                    _id,
                },
            });
            return doc;
        });
        yield vectorIndex.addDocuments(docs);
        res.status(200).json({
            message: "Embeddings created successfully",
        });
    }
    catch (error) {
        next(error);
    }
});
exports.createEmbeddings = createEmbeddings;
