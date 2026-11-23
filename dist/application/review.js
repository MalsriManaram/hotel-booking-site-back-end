"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteReview = exports.upsertReview = exports.getReviewsByHotel = void 0;
const zod_1 = require("zod");
const Review_1 = __importDefault(require("../infrastructure/schemas/Review"));
const Hotel_1 = __importDefault(require("../infrastructure/schemas/Hotel"));
const Booking_1 = __importDefault(require("../infrastructure/schemas/Booking"));
const validation_error_1 = __importDefault(require("../domain/errors/validation-error"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
const forbidden_error_1 = __importDefault(require("../domain/errors/forbidden-error"));
const authorization_middleware_1 = require("../api/middlewares/authorization-middleware");
const embedding_1 = require("./embedding");
const gemini_1 = require("./gemini");
const CreateReviewDTO = zod_1.z.object({
    hotelId: zod_1.z.string().min(1),
    rating: zod_1.z.coerce.number().min(1).max(5),
    title: zod_1.z.string().max(120).optional().default(""),
    comment: zod_1.z.string().min(5, "Review comment must be at least 5 characters").max(1500),
    tripType: zod_1.z
        .enum(["Couple", "Family", "Solo", "Business", "Friends"])
        .optional()
        .default("Couple"),
    userName: zod_1.z.string().min(1).optional().default("StayLux Guest"),
    userAvatar: zod_1.z.string().optional().default(""),
});
function buildLocalReviewHighlights(reviews) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let verifiedCount = 0;
    const tripCounts = {};
    const aspectMentions = [
        { label: "Prime Location", regex: /location|central|walk|close|view|views|harbour|metro/i, hits: 0 },
        { label: "Warm Service", regex: /staff|service|friendly|helpful|hospitality|welcome/i, hits: 0 },
        { label: "Spotless Rooms", regex: /clean|spotless|room|bed|comfortable|spacious|quiet/i, hits: 0 },
        { label: "Great Dining", regex: /breakfast|food|dining|restaurant|coffee|dinner/i, hits: 0 },
        { label: "Luxury Value", regex: /luxury|worth|value|pool|spa|amenities/i, hits: 0 },
    ];
    for (const r of reviews) {
        const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
        distribution[star] = (distribution[star] || 0) + 1;
        if (r.verifiedStay)
            verifiedCount += 1;
        if (r.tripType) {
            tripCounts[r.tripType] = (tripCounts[r.tripType] || 0) + 1;
        }
        const text = `${r.title || ""} ${r.comment || ""}`;
        for (const aspect of aspectMentions) {
            if (aspect.regex.test(text))
                aspect.hits += 1;
        }
    }
    const praisedHighlights = aspectMentions
        .filter((a) => a.hits > 0)
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 3)
        .map((a) => a.label);
    const topTripType = Object.entries(tripCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    let aiSummary = "";
    if (reviews.length > 0) {
        const avg = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
        const sentiment = avg >= 4.5
            ? "Guests consistently praise this property as exceptional"
            : avg >= 3.8
                ? "Guests report a positive and comfortable stay overall"
                : "Guest feedback highlights mixed experiences";
        const highlightText = praisedHighlights.length > 0
            ? `, frequently highlighting ${praisedHighlights.join(", ").toLowerCase()}`
            : "";
        const tripText = topTripType ? `. Especially popular with ${topTripType.toLowerCase()} travelers.` : ".";
        aiSummary = `${sentiment}${highlightText}${tripText}`;
    }
    return {
        totalWrittenReviews: reviews.length,
        verifiedCount,
        distribution,
        praisedHighlights,
        topTripType: topTripType || null,
        aiSummary,
    };
}
const getReviewsByHotel = async (req, res, next) => {
    try {
        const { hotelId } = req.params;
        const [reviews, hotel] = await Promise.all([
            Review_1.default.find({ hotelId }).sort({ createdAt: -1 }),
            Hotel_1.default.findById(hotelId, { name: 1 }),
        ]);
        const summary = buildLocalReviewHighlights(reviews);
        // Upgrade summary with Gemini 3.8 Flash Free Tier (cached per review state)
        if (reviews.length > 0 && (0, gemini_1.isGeminiConfigured)()) {
            try {
                const latestStamp = reviews[0]?.updatedAt
                    ? new Date(reviews[0].updatedAt).getTime()
                    : reviews.length;
                const cacheKey = `${hotelId}:${reviews.length}:${latestStamp}`;
                const reviewsText = reviews
                    .slice(0, 12)
                    .map((r) => `[${r.rating}/5, ${r.tripType}] ${r.title ? r.title + ": " : ""}${r.comment}`)
                    .join("\n");
                const geminiSummary = await (0, gemini_1.summarizeReviewsWithGemini)({
                    cacheKey,
                    hotelName: hotel?.name || "StayLux Hotel",
                    reviewsText,
                });
                if (geminiSummary) {
                    summary.aiSummary = geminiSummary;
                }
            }
            catch (err) {
                console.warn("Gemini review summary fallback:", err?.message ?? err);
            }
        }
        res.status(200).json({ reviews, summary });
    }
    catch (error) {
        next(error);
    }
};
exports.getReviewsByHotel = getReviewsByHotel;
const upsertReview = async (req, res, next) => {
    try {
        const parsed = CreateReviewDTO.safeParse(req.body);
        if (!parsed.success) {
            throw new validation_error_1.default(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
        }
        const userId = req?.auth?.userId;
        const data = parsed.data;
        const hotel = await Hotel_1.default.findById(data.hotelId);
        if (!hotel) {
            throw new not_found_error_1.default("Hotel not found");
        }
        const hasStay = await Booking_1.default.exists({
            hotelId: data.hotelId,
            userId,
            status: { $ne: "Canceled" },
        });
        const existingReview = await Review_1.default.findOne({
            hotelId: data.hotelId,
            userId,
        });
        let savedReview;
        if (existingReview) {
            const oldRating = existingReview.rating;
            existingReview.rating = data.rating;
            existingReview.title = data.title;
            existingReview.comment = data.comment;
            existingReview.tripType = data.tripType;
            existingReview.userName = data.userName;
            existingReview.userAvatar = data.userAvatar;
            existingReview.verifiedStay = Boolean(hasStay);
            savedReview = await existingReview.save();
            const currentCount = Math.max(1, hotel.reviews || 1);
            const currentAvg = hotel.rating || data.rating;
            const updatedAvg = (currentAvg * currentCount - oldRating + data.rating) / currentCount;
            hotel.rating = Number(Math.min(5, Math.max(1, updatedAvg)).toFixed(1));
            await hotel.save();
        }
        else {
            savedReview = await Review_1.default.create({
                hotelId: data.hotelId,
                userId,
                userName: data.userName,
                userAvatar: data.userAvatar,
                rating: data.rating,
                title: data.title,
                comment: data.comment,
                tripType: data.tripType,
                verifiedStay: Boolean(hasStay),
            });
            const prevCount = hotel.reviews || 0;
            const prevRating = hotel.rating || 0;
            const newCount = prevCount + 1;
            const newRating = prevCount > 0
                ? (prevRating * prevCount + data.rating) / newCount
                : data.rating;
            hotel.reviews = newCount;
            hotel.rating = Number(Math.min(5, Math.max(1, newRating)).toFixed(1));
            await hotel.save();
        }
        (0, embedding_1.upsertHotelVector)(hotel).catch(() => { });
        res.status(201).json({
            message: existingReview ? "Review updated" : "Review submitted",
            review: savedReview,
            hotelRating: hotel.rating,
            hotelReviewsCount: hotel.reviews,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.upsertReview = upsertReview;
const deleteReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requesterId = req?.auth?.userId;
        const adminAllowed = await (0, authorization_middleware_1.checkIsAdminRequest)(req);
        const review = await Review_1.default.findById(id);
        if (!review) {
            throw new not_found_error_1.default("Review not found");
        }
        if (review.userId !== requesterId && !adminAllowed) {
            throw new forbidden_error_1.default("You can only delete your own review");
        }
        await Review_1.default.findByIdAndDelete(id);
        res.status(200).json({ message: "Review deleted" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteReview = deleteReview;
