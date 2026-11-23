"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_EMBEDDING_DIM = exports.GEMINI_EMBEDDING_MODEL = exports.GEMINI_CHAT_MODEL = exports.GEMINI_CHAT_MODELS = void 0;
exports.getGeminiApiKey = getGeminiApiKey;
exports.isGeminiConfigured = isGeminiConfigured;
exports.getGeminiClient = getGeminiClient;
exports.normalizeVectorL2 = normalizeVectorL2;
exports.vectorCosineSimilarity = vectorCosineSimilarity;
exports.embedTextWithGemini = embedTextWithGemini;
exports.embedDocumentsBatchWithGemini = embedDocumentsBatchWithGemini;
exports.runGeminiConciergeTurn = runGeminiConciergeTurn;
exports.summarizeReviewsWithGemini = summarizeReviewsWithGemini;
const genai_1 = require("@google/genai");
exports.GEMINI_CHAT_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
];
exports.GEMINI_CHAT_MODEL = exports.GEMINI_CHAT_MODELS[0];
exports.GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
exports.GEMINI_EMBEDDING_DIM = 768;
let cachedClient = null;
let cachedApiKey = "";
function getGeminiApiKey() {
    return (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
}
function isGeminiConfigured() {
    return getGeminiApiKey().length > 0;
}
function getGeminiClient() {
    const apiKey = getGeminiApiKey();
    if (!apiKey)
        return null;
    if (!cachedClient || cachedApiKey !== apiKey) {
        cachedClient = new genai_1.GoogleGenAI({ apiKey });
        cachedApiKey = apiKey;
    }
    return cachedClient;
}
function normalizeVectorL2(values) {
    if (!values || values.length === 0)
        return null;
    let normSq = 0;
    for (let i = 0; i < values.length; i++) {
        normSq += values[i] * values[i];
    }
    if (normSq === 0)
        return values;
    const invNorm = 1 / Math.sqrt(normSq);
    return values.map((v) => v * invNorm);
}
function vectorCosineSimilarity(a, b) {
    const len = Math.min(a.length, b.length);
    if (len === 0)
        return 0;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    if (magA === 0 || magB === 0)
        return 0;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
async function embedTextWithGemini(text, taskType = "RETRIEVAL_QUERY", title) {
    const client = getGeminiClient();
    if (!client || !text.trim())
        return null;
    const response = await client.models.embedContent({
        model: exports.GEMINI_EMBEDDING_MODEL,
        contents: text,
        config: {
            taskType,
            outputDimensionality: exports.GEMINI_EMBEDDING_DIM,
            ...(taskType === "RETRIEVAL_DOCUMENT" && title ? { title } : {}),
        },
    });
    return normalizeVectorL2(response.embeddings?.[0]?.values);
}
async function embedDocumentsBatchWithGemini(texts) {
    const client = getGeminiClient();
    if (!client || texts.length === 0)
        return [];
    const response = await client.models.embedContent({
        model: exports.GEMINI_EMBEDDING_MODEL,
        contents: texts,
        config: {
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: exports.GEMINI_EMBEDDING_DIM,
        },
    });
    const list = response.embeddings || [];
    return texts.map((_, idx) => normalizeVectorL2(list[idx]?.values));
}
async function createInteractionWithFailover(params) {
    const client = getGeminiClient();
    if (!client)
        return null;
    const preferred = process.env.GEMINI_MODEL?.trim();
    const candidates = preferred
        ? [preferred, ...exports.GEMINI_CHAT_MODELS.filter((m) => m !== preferred)]
        : [...exports.GEMINI_CHAT_MODELS];
    let lastError = null;
    for (const modelName of candidates) {
        try {
            const interaction = await client.interactions.create({
                model: modelName,
                system_instruction: params.system_instruction,
                input: params.input,
                ...(params.store !== undefined ? { store: params.store } : {}),
                ...(params.previous_interaction_id
                    ? { previous_interaction_id: params.previous_interaction_id }
                    : {}),
            });
            const text = (interaction.output_text || "").trim();
            if (text) {
                return {
                    text,
                    interactionId: interaction.id,
                    modelUsed: modelName,
                };
            }
        }
        catch (err) {
            lastError = err;
            // If previous_interaction_id failed on failover or expired (1-day Free Tier TTL), retry stateless once
            if (params.previous_interaction_id) {
                try {
                    const retryStateless = await client.interactions.create({
                        model: modelName,
                        system_instruction: params.system_instruction,
                        input: params.input,
                    });
                    const retryText = (retryStateless.output_text || "").trim();
                    if (retryText) {
                        return {
                            text: retryText,
                            interactionId: retryStateless.id,
                            modelUsed: modelName,
                        };
                    }
                }
                catch (innerErr) {
                    lastError = innerErr;
                }
            }
        }
    }
    if (lastError) {
        throw lastError;
    }
    return null;
}
async function runGeminiConciergeTurn(params) {
    // Per Interactions API rules, system_instruction is interaction-scoped and supplied each turn
    const systemInstruction = [
        "You are the official StayLux AI Travel Concierge for a luxury hotel booking platform.",
        "Ground all hotel names, locations, nightly USD prices, ratings, room categories, and amenities strictly on the LIVE CATALOG below—never invent non-existent StayLux hotels.",
        "Active StayLux Promo Codes: STAYLUX10 (10% off any stay), WELCOME15 (15% off Deluxe & Suite rooms), LUXURY20 (20% off stays of 4+ nights).",
        "Checkout & Policies: Guests can reserve immediately using StayLux Instant WhatsApp Store Checkout (no upfront card needed, generates a SLX-... booking reference) or Pay at Property on arrival, with 48-hour free cancellation on most properties.",
        "Keep responses warm, concise (under 140 words unless planning a multi-day itinerary), and format key names/prices in **bold**.",
        "",
        "=== LIVE STAYLUX HOTEL CATALOG ===",
        params.hotelsCatalogSummary,
    ].join("\n");
    const result = await createInteractionWithFailover({
        system_instruction: systemInstruction,
        input: params.userMessage,
        previous_interaction_id: params.previousInteractionId,
    });
    if (!result)
        return null;
    return {
        reply: result.text,
        interactionId: result.interactionId,
        modelUsed: result.modelUsed,
    };
}
// In-memory review summary cache keyed by `${hotelId}:${reviewCount}:${latestTimestamp}`
const reviewSummaryCache = new Map();
async function summarizeReviewsWithGemini(params) {
    const cached = reviewSummaryCache.get(params.cacheKey);
    if (cached)
        return cached;
    if (!params.reviewsText.trim())
        return null;
    const result = await createInteractionWithFailover({
        store: false,
        system_instruction: "Summarize verified hotel guest reviews in 2 concise, balanced sentences (max 55 words). Highlight what guests loved most and who the hotel is best suited for. Plain text only.",
        input: `Hotel: ${params.hotelName}\nGuest Reviews:\n${params.reviewsText}`,
    });
    if (result?.text) {
        reviewSummaryCache.set(params.cacheKey, result.text);
        return result.text;
    }
    return null;
}
