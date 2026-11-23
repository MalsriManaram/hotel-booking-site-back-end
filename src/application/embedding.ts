import { Request, Response, NextFunction } from "express";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { Document } from "@langchain/core/documents";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import mongoose from "mongoose";
import Hotel, { normalizeHotelDoc } from "../infrastructure/schemas/Hotel";
import {
  embedDocumentsBatchWithGemini,
  embedTextWithGemini,
  GEMINI_EMBEDDING_MODEL,
  isGeminiConfigured,
} from "./gemini";

export function buildHotelEmbeddingText(hotelObj: any): string {
  const normalized = normalizeHotelDoc(hotelObj);
  const amenitiesStr = (normalized.amenities || []).join(", ");
  const tagsStr = (normalized.tags || []).join(", ");
  return `Hotel Name: ${normalized.name}. Location: ${normalized.location}. Rating: ${
    normalized.rating || "New"
  }. Price per night: $${normalized.price}. Tags: ${tagsStr}. Amenities: ${amenitiesStr}. Description: ${
    normalized.description
  }`;
}

function getGeminiVectorCollection() {
  return mongoose.connection.db?.collection("hotelGeminiVectors");
}

function getLegacyHfVectorCollection() {
  return mongoose.connection.db?.collection("hotelVectors");
}

export async function ensureGeminiHotelVectors(
  hotels: any[]
): Promise<Map<string, number[]>> {
  const vectorMap = new Map<string, number[]>();
  if (!isGeminiConfigured() || hotels.length === 0) return vectorMap;

  const collection = getGeminiVectorCollection();
  if (!collection) return vectorMap;

  const existingDocs = await collection
    .find({ model: GEMINI_EMBEDDING_MODEL })
    .toArray();

  for (const doc of existingDocs) {
    if (doc.hotelId && Array.isArray(doc.embedding) && doc.embedding.length > 0) {
      vectorMap.set(String(doc.hotelId), doc.embedding);
    }
  }

  const missingHotels = hotels.filter((h) => !vectorMap.has(String(h._id)));
  if (missingHotels.length > 0) {
    const texts = missingHotels.map((h) => buildHotelEmbeddingText(h));
    const embeddings = await embedDocumentsBatchWithGemini(texts);

    const bulkOps: any[] = [];
    missingHotels.forEach((h, idx) => {
      const vec = embeddings[idx];
      if (vec && vec.length > 0) {
        vectorMap.set(String(h._id), vec);
        bulkOps.push({
          updateOne: {
            filter: { hotelId: String(h._id) },
            update: {
              $set: {
                hotelId: String(h._id),
                embedding: vec,
                model: GEMINI_EMBEDDING_MODEL,
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      }
    });

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
    }
  }

  return vectorMap;
}

export async function upsertHotelVector(hotelDoc: any): Promise<boolean> {
  if (isGeminiConfigured()) {
    const collection = getGeminiVectorCollection();
    if (!collection) return false;
    const text = buildHotelEmbeddingText(hotelDoc);
    const vec = await embedTextWithGemini(
      text,
      "RETRIEVAL_DOCUMENT",
      hotelDoc.name
    );
    if (!vec) return false;

    await collection.updateOne(
      { hotelId: String(hotelDoc._id) },
      {
        $set: {
          hotelId: String(hotelDoc._id),
          embedding: vec,
          model: GEMINI_EMBEDDING_MODEL,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    return true;
  }

  if (!process.env.HUGGINGFACE_API_KEY) return false;
  const hfCollection = getLegacyHfVectorCollection();
  if (!hfCollection) return false;

  const embeddingsModel = new HuggingFaceInferenceEmbeddings({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    apiKey: process.env.HUGGINGFACE_API_KEY,
  });

  await hfCollection.deleteMany({
    $or: [
      { "metadata._id": hotelDoc._id },
      { _id: hotelDoc._id },
      { "metadata._id": String(hotelDoc._id) },
    ],
  });

  const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
    collection: hfCollection as any,
    indexName: "vector_index",
  });

  const doc = new Document({
    pageContent: buildHotelEmbeddingText(hotelDoc),
    metadata: {
      _id: hotelDoc._id,
    },
  });

  await vectorIndex.addDocuments([doc]);
  return true;
}

export async function removeHotelVector(hotelId: string): Promise<void> {
  const geminiCol = getGeminiVectorCollection();
  if (geminiCol) {
    await geminiCol.deleteMany({ hotelId: String(hotelId) });
  }

  const hfCol = getLegacyHfVectorCollection();
  if (hfCol) {
    const filters: any[] = [{ "metadata._id": hotelId }];
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      filters.push({ "metadata._id": new mongoose.Types.ObjectId(hotelId) });
    }
    await hfCol.deleteMany({ $or: filters });
  }
}

export const createEmbeddings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotels = await Hotel.find({});

    // Priority 1: Google Gemini API Free Tier (gemini-embedding-001)
    if (isGeminiConfigured()) {
      const collection = getGeminiVectorCollection();
      if (!collection) {
        res.status(500).json({ message: "Database vector collection unavailable" });
        return;
      }

      await collection.deleteMany({});
      const texts = hotels.map((h) => buildHotelEmbeddingText(h));
      const embeddings = await embedDocumentsBatchWithGemini(texts);

      const docsToInsert = hotels
        .map((h, idx) =>
          embeddings[idx]
            ? {
                hotelId: String(h._id),
                embedding: embeddings[idx],
                model: GEMINI_EMBEDDING_MODEL,
                updatedAt: new Date(),
              }
            : null
        )
        .filter(Boolean);

      if (docsToInsert.length > 0) {
        await collection.insertMany(docsToInsert as any[]);
      }

      res.status(200).json({
        message: `Indexed ${docsToInsert.length} hotels with Google Gemini Free Tier (${GEMINI_EMBEDDING_MODEL}).`,
        indexedCount: docsToInsert.length,
        mode: "gemini-embedding-001",
      });
      return;
    }

    // Priority 2: Legacy Hugging Face Inference fallback
    if (!process.env.HUGGINGFACE_API_KEY) {
      res.status(200).json({
        message:
          "Add GEMINI_API_KEY to .env to enable Google Gemini embeddings (currently using zero-key local semantic fallback).",
        indexedCount: hotels.length,
        mode: "local-hybrid",
      });
      return;
    }

    const hfCollection = getLegacyHfVectorCollection();
    if (!hfCollection) {
      res.status(500).json({ message: "Database vector collection unavailable" });
      return;
    }

    await hfCollection.deleteMany({});
    const embeddingsModel = new HuggingFaceInferenceEmbeddings({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });

    const vectorIndex = new MongoDBAtlasVectorSearch(embeddingsModel, {
      collection: hfCollection as any,
      indexName: "vector_index",
    });

    const docs = hotels.map(
      (hotel) =>
        new Document({
          pageContent: buildHotelEmbeddingText(hotel),
          metadata: { _id: hotel._id },
        })
    );

    if (docs.length > 0) {
      await vectorIndex.addDocuments(docs);
    }

    res.status(200).json({
      message: `Synced ${docs.length} hotel embeddings via Hugging Face.`,
      indexedCount: docs.length,
      mode: "huggingface-atlas-hybrid",
    });
  } catch (error) {
    next(error);
  }
};
