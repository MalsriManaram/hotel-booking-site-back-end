"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conciergeChat = exports.retrieve = void 0;
const Hotel_1 = __importStar(require("../infrastructure/schemas/Hotel"));
const Booking_1 = __importDefault(require("../infrastructure/schemas/Booking"));
const mongoose_1 = __importDefault(require("mongoose"));
const hf_1 = require("@langchain/community/embeddings/hf");
const mongodb_1 = require("@langchain/mongodb");
const nlp_search_1 = require("./nlp-search");
const embedding_1 = require("./embedding");
const gemini_1 = require("./gemini");
const retrieve = async (req, res, next) => {
    try {
        const { query: rawNaturalQuery, description, rating, location, price, minPrice, amenities, checkIn, checkOut, sortBy, } = req.query;
        const allHotelDocs = await Hotel_1.default.find({});
        const allHotels = allHotelDocs.map(Hotel_1.normalizeHotelDoc);
        const combinedText = [
            rawNaturalQuery,
            description,
            location ? `in ${location}` : "",
            price ? `under $${price}` : "",
            rating ? `${rating}+ rating` : "",
        ]
            .filter(Boolean)
            .join(" ")
            .trim();
        const hasAnyCriteria = Boolean(combinedText || minPrice || amenities || (checkIn && checkOut));
        const knownLocations = allHotels.map((h) => h.location).filter(Boolean);
        const parsed = (0, nlp_search_1.parseNaturalLanguageHotelQuery)(String(rawNaturalQuery || description || ""), knownLocations);
        const effectiveLocation = (location && String(location).trim() !== "" && String(location) !== "ALL"
            ? String(location).trim()
            : undefined) || parsed.extractedLocation;
        const effectiveMaxPrice = price && Number(price) > 0 ? Number(price) : parsed.maxPrice;
        const effectiveMinPrice = minPrice && Number(minPrice) > 0 ? Number(minPrice) : parsed.minPrice;
        const effectiveMinRating = rating && Number(rating) > 0 ? Number(rating) : parsed.minRating;
        const requestedAmenities = [
            ...(amenities
                ? String(amenities)
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean)
                : []),
            ...parsed.amenities,
        ];
        // Optional date-range availability filtering
        const unavailableHotelIds = new Set();
        if (checkIn && checkOut) {
            const start = new Date(String(checkIn));
            const end = new Date(String(checkOut));
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
                const overlapping = await Booking_1.default.find({
                    status: { $ne: "Canceled" },
                    arrivalDate: { $lt: end },
                    departureDate: { $gt: start },
                });
                const countsByHotel = {};
                for (const b of overlapping) {
                    const hid = String(b.hotelId);
                    countsByHotel[hid] = (countsByHotel[hid] || 0) + 1;
                }
                for (const h of allHotels) {
                    const totalHotelRooms = (h.roomTypes || []).reduce((sum, rt) => sum + (rt.totalRooms || 0), 0);
                    if ((countsByHotel[String(h._id)] || 0) >= Math.max(1, totalHotelRooms)) {
                        unavailableHotelIds.add(String(h._id));
                    }
                }
            }
        }
        if (!hasAnyCriteria) {
            const baseResults = allHotels.map((hotel) => ({
                hotel,
                confidence: 1,
            }));
            res.status(200).json(sortHotelResults(baseResults, String(sortBy || "")));
            return;
        }
        // Priority 1: Google Gemini API Free Tier Neural Vector Search (gemini-embedding-001)
        const vectorScores = new Map();
        if ((0, gemini_1.isGeminiConfigured)() && combinedText.length > 0) {
            try {
                const [queryVec, hotelVecMap] = await Promise.all([
                    (0, gemini_1.embedTextWithGemini)(combinedText, "RETRIEVAL_QUERY"),
                    (0, embedding_1.ensureGeminiHotelVectors)(allHotels),
                ]);
                if (queryVec) {
                    for (const h of allHotels) {
                        const hVec = hotelVecMap.get(String(h._id));
                        if (hVec) {
                            const sim = (0, gemini_1.vectorCosineSimilarity)(queryVec, hVec);
                            vectorScores.set(String(h._id), Math.max(0, sim));
                        }
                    }
                }
            }
            catch (geminiErr) {
                console.warn("Gemini embedding search fallback triggered:", geminiErr?.message ?? geminiErr);
            }
        }
        else if (process.env.HUGGINGFACE_API_KEY && combinedText.length > 0) {
            // Priority 2: Legacy Hugging Face + Atlas Vector Search
            try {
                const embeddingsModel = new hf_1.HuggingFaceInferenceEmbeddings({
                    model: "sentence-transformers/all-MiniLM-L6-v2",
                    apiKey: process.env.HUGGINGFACE_API_KEY,
                });
                const vectorIndex = new mongodb_1.MongoDBAtlasVectorSearch(embeddingsModel, {
                    collection: mongoose_1.default.connection.db?.collection("hotelVectors"),
                    indexName: "vector_index",
                });
                const results = await vectorIndex.similaritySearchWithScore(combinedText, Math.max(8, allHotels.length));
                for (const [doc, score] of results) {
                    if (doc?.metadata?._id) {
                        vectorScores.set(String(doc.metadata._id), Number(score) || 0);
                    }
                }
            }
            catch (vecErr) {
                console.warn("HF vector search unavailable, using local hybrid fallback:", vecErr?.message ?? vecErr);
            }
        }
        const scoredResults = allHotels
            .filter((hotel) => {
            if (unavailableHotelIds.has(String(hotel._id)))
                return false;
            if (effectiveLocation &&
                !hotel.location
                    .toLowerCase()
                    .includes(effectiveLocation.toLowerCase())) {
                return false;
            }
            if (effectiveMaxPrice && hotel.price > effectiveMaxPrice)
                return false;
            if (effectiveMinPrice && hotel.price < effectiveMinPrice)
                return false;
            if (effectiveMinRating &&
                hotel.rating > 0 &&
                hotel.rating < effectiveMinRating) {
                return false;
            }
            if (requestedAmenities.length > 0) {
                const hotelAmLower = (hotel.amenities || []).map((a) => a.toLowerCase());
                const descLower = (hotel.description || "").toLowerCase();
                const hasAll = requestedAmenities.every((reqAm) => {
                    const target = reqAm.toLowerCase();
                    return (hotelAmLower.some((ha) => ha.includes(target) || target.includes(ha)) || descLower.includes(target.split(" ")[0]));
                });
                if (!hasAll)
                    return false;
            }
            return true;
        })
            .map((hotel) => {
            const localScore = (0, nlp_search_1.computeLocalHybridScore)(combinedText, parsed, hotel);
            const neuralScore = vectorScores.get(String(hotel._id));
            const finalConfidence = neuralScore !== undefined
                ? Number((0.7 * neuralScore + 0.3 * localScore).toFixed(4))
                : localScore;
            return {
                hotel,
                confidence: Math.min(0.99, Math.max(0.2, finalConfidence)),
            };
        });
        const sorted = sortHotelResults(scoredResults, String(sortBy || "ai_match"));
        res.status(200).json(sorted);
    }
    catch (error) {
        next(error);
    }
};
exports.retrieve = retrieve;
function sortHotelResults(items, sortBy) {
    const copy = [...items];
    switch (sortBy) {
        case "price_asc":
            return copy.sort((a, b) => (a.hotel.price || 0) - (b.hotel.price || 0));
        case "price_desc":
            return copy.sort((a, b) => (b.hotel.price || 0) - (a.hotel.price || 0));
        case "rating_desc":
            return copy.sort((a, b) => (b.hotel.rating || 0) - (a.hotel.rating || 0));
        case "ai_match":
        default:
            return copy.sort((a, b) => b.confidence - a.confidence);
    }
}
const CITY_ITINERARIES = {
    paris: [
        "Day 1: Morning stroll in Montmartre & Sacré-Cœur, afternoon Louvre Museum tour, sunset Seine River cruise.",
        "Day 2: Eiffel Tower summit visit, lunch in Le Marais, luxury shopping along Champs-Élysées.",
        "Day 3: Café breakfast in Saint-Germain, Musée d'Orsay, farewell gourmet French dinner.",
    ],
    sydney: [
        "Day 1: Sydney Opera House architectural tour, Circular Quay waterfront lunch, The Rocks evening walk.",
        "Day 2: Bondi to Coogee coastal cliff walk, beachside seafood dining, Darling Harbour sunset.",
        "Day 3: Ferry to Manly Beach, Royal Botanic Garden stroll, rooftop cocktails overlooking the Harbour Bridge.",
    ],
    tokyo: [
        "Day 1: Senso-ji Temple in Asakusa, Meiji Shrine & Harajuku, evening neon walk at Shibuya Crossing.",
        "Day 2: Tsukiji Outer Market sushi breakfast, Imperial Palace East Gardens, Tokyo Tower skyline views.",
        "Day 3: Ginza boutique shopping, teamLab digital art experience, izakaya tasting in Shinjuku.",
    ],
    kyoto: [
        "Day 1: Sunrise at Fushimi Inari Taisha torii gates, traditional matcha ceremony in Gion.",
        "Day 2: Arashiyama Bamboo Grove, Tenryu-ji Zen garden, Kinkaku-ji Golden Pavilion.",
        "Day 3: Philosopher's Path canal walk, Nishiki Market tasting, tranquil ryokan-style dinner.",
    ],
    rome: [
        "Day 1: Colosseum & Roman Forum early-access tour, sunset gelato at Piazza Navona & Pantheon.",
        "Day 2: Vatican Museums, Sistine Chapel & St. Peter's Basilica, evening trattoria in Trastevere.",
        "Day 3: Trevi Fountain morning toss, Spanish Steps & Via Condotti boutiques, Villa Borghese gardens.",
    ],
    milan: [
        "Day 1: Milan Cathedral (Duomo) rooftop terraces, Galleria Vittorio Emanuele II luxury arcade.",
        "Day 2: Da Vinci's Last Supper at Santa Maria delle Grazie, Brera Design District & Pinacoteca.",
        "Day 3: Quadrilatero della Moda fashion walk, sunset aperitivo along the Navigli canals.",
    ],
};
function selectRelevantHotelsForMessage(userMessage, hotels) {
    const lower = userMessage.toLowerCase();
    if (/^(hi|hello|hey|thanks|thank you)\b/i.test(lower) && lower.length < 20) {
        return [];
    }
    if (/whatsapp|payment|cancel|refund|policy/i.test(lower) && !/hotel|stay|room/i.test(lower)) {
        return [];
    }
    const knownLocations = hotels.map((h) => h.location).filter(Boolean);
    const parsed = (0, nlp_search_1.parseNaturalLanguageHotelQuery)(userMessage, knownLocations);
    let candidates = hotels.filter((h) => {
        if (parsed.extractedLocation &&
            !h.location.toLowerCase().includes(parsed.extractedLocation.toLowerCase())) {
            return false;
        }
        if (parsed.maxPrice && h.price > parsed.maxPrice)
            return false;
        if (parsed.minRating && h.rating > 0 && h.rating < parsed.minRating)
            return false;
        return true;
    });
    if (candidates.length === 0) {
        candidates = hotels;
    }
    return candidates
        .map((hotel) => ({
        hotel,
        score: (0, nlp_search_1.computeLocalHybridScore)(userMessage, parsed, hotel),
    }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((r) => r.hotel);
}
// Conversational AI Concierge powered by Google Gemini Free Tier (gemini-3.8-flash Interactions API)
// with automatic zero-key fallback if GEMINI_API_KEY is not yet set
const conciergeChat = async (req, res, next) => {
    try {
        const userMessage = String(req.body?.message || "").trim();
        const previousInteractionId = req.body?.previousInteractionId
            ? String(req.body.previousInteractionId)
            : undefined;
        if (!userMessage) {
            res.status(400).json({ message: "Message is required" });
            return;
        }
        const hotelDocs = await Hotel_1.default.find({});
        const hotels = hotelDocs.map(Hotel_1.normalizeHotelDoc);
        const recommendedHotels = selectRelevantHotelsForMessage(userMessage, hotels);
        // Priority 1: Google Gemini Free Tier (gemini-3.8-flash via Interactions API)
        if ((0, gemini_1.isGeminiConfigured)()) {
            try {
                const catalogSummary = hotels
                    .map((h) => `- ${h.name} (${h.location}): Base $${h.price}/night, Rating ${h.rating || "New"}★ (${h.reviews || 0} reviews), Tags: [${(h.tags || []).join(", ")}], Amenities: [${(h.amenities || []).join(", ")}]. ${h.description}`)
                    .join("\n");
                const geminiTurn = await (0, gemini_1.runGeminiConciergeTurn)({
                    userMessage,
                    hotelsCatalogSummary: catalogSummary,
                    previousInteractionId,
                });
                if (geminiTurn) {
                    res.status(200).json({
                        reply: geminiTurn.reply,
                        interactionId: geminiTurn.interactionId,
                        provider: gemini_1.GEMINI_CHAT_MODEL,
                        recommendedHotels,
                    });
                    return;
                }
            }
            catch (geminiErr) {
                console.warn("Gemini concierge fallback triggered:", geminiErr?.message ?? geminiErr);
            }
        }
        // Priority 2: Built-in Zero-Key Fallback Advisor
        const lower = userMessage.toLowerCase();
        const knownLocations = hotels.map((h) => h.location).filter(Boolean);
        const parsed = (0, nlp_search_1.parseNaturalLanguageHotelQuery)(userMessage, knownLocations);
        if (/promo|discount|coupon|code|offer|deal/i.test(lower)) {
            res.status(200).json({
                reply: "Here are StayLux's active promo codes you can apply inside the Booking Dialog:\n• **STAYLUX10** — 10% off any room reservation\n• **WELCOME15** — 15% off Deluxe & Suite stays\n• **LUXURY20** — 20% off stays of 4 or more nights!",
                provider: "local-fallback",
                recommendedHotels: hotels.slice(0, 2),
            });
            return;
        }
        if (/whatsapp|payment|pay|card|cancel|refund|policy/i.test(lower)) {
            res.status(200).json({
                reply: "StayLux uses our **Instant WhatsApp Store Checkout** and **Pay at Property** options—no upfront credit card required! Your room dates are reserved with a `SLX-...` reference, and most properties offer **free cancellation up to 48 hours** before check-in.",
                provider: "local-fallback",
                recommendedHotels: [],
            });
            return;
        }
        if (/itinerary|plan|things to do|trip|schedule|days in/i.test(lower)) {
            const matchedCity = Object.keys(CITY_ITINERARIES).find((city) => lower.includes(city));
            if (matchedCity) {
                const cityHotels = hotels.filter((h) => h.location.toLowerCase().includes(matchedCity));
                const cityTitle = matchedCity.charAt(0).toUpperCase() + matchedCity.slice(1);
                res.status(200).json({
                    reply: `Here is a curated 3-day luxury **${cityTitle}** itinerary:\n\n${CITY_ITINERARIES[matchedCity]
                        .map((line) => `• ${line}`)
                        .join("\n")}\n\nRecommended StayLux properties in ${cityTitle}:`,
                    provider: "local-fallback",
                    recommendedHotels: cityHotels.slice(0, 2),
                });
                return;
            }
        }
        const filterSummary = [
            parsed.extractedLocation ? `in **${parsed.extractedLocation}**` : "",
            parsed.maxPrice ? `under **$${parsed.maxPrice}/night**` : "",
            parsed.minRating ? `rated **${parsed.minRating}★+**` : "",
        ]
            .filter(Boolean)
            .join(" ");
        const intro = recommendedHotels.length > 0
            ? `I found ${recommendedHotels.length} StayLux ${recommendedHotels.length === 1 ? "property" : "properties"} ${filterSummary || "matching your preferences"}:\n` +
                recommendedHotels
                    .map((h) => `• **${h.name}** (${h.location}) — **$${h.price}/night**, ${h.rating ? `${h.rating}★` : "New"}`)
                    .join("\n")
            : "Let me know your preferred city or budget and I'll recommend the best StayLux hotels!";
        res.status(200).json({
            reply: intro,
            provider: "local-fallback",
            recommendedHotels,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.conciergeChat = conciergeChat;
