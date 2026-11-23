import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import Review from "../infrastructure/schemas/Review";
import Hotel from "../infrastructure/schemas/Hotel";
import Booking from "../infrastructure/schemas/Booking";
import ValidationError from "../domain/errors/validation-error";
import NotFoundError from "../domain/errors/not-found-error";
import ForbiddenError from "../domain/errors/forbidden-error";
import { checkIsAdminRequest } from "../api/middlewares/authorization-middleware";
import { upsertHotelVector } from "./embedding";
import { isGeminiConfigured, summarizeReviewsWithGemini } from "./gemini";

const CreateReviewDTO = z.object({
  hotelId: z.string().min(1),
  rating: z.coerce.number().min(1).max(5),
  title: z.string().max(120).optional().default(""),
  comment: z.string().min(5, "Review comment must be at least 5 characters").max(1500),
  tripType: z
    .enum(["Couple", "Family", "Solo", "Business", "Friends"])
    .optional()
    .default("Couple"),
  userName: z.string().min(1).optional().default("StayLux Guest"),
  userAvatar: z.string().optional().default(""),
});

function buildLocalReviewHighlights(reviews: any[]) {
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let verifiedCount = 0;
  const tripCounts: Record<string, number> = {};
  const aspectMentions: Array<{ label: string; regex: RegExp; hits: number }> = [
    { label: "Prime Location", regex: /location|central|walk|close|view|views|harbour|metro/i, hits: 0 },
    { label: "Warm Service", regex: /staff|service|friendly|helpful|hospitality|welcome/i, hits: 0 },
    { label: "Spotless Rooms", regex: /clean|spotless|room|bed|comfortable|spacious|quiet/i, hits: 0 },
    { label: "Great Dining", regex: /breakfast|food|dining|restaurant|coffee|dinner/i, hits: 0 },
    { label: "Luxury Value", regex: /luxury|worth|value|pool|spa|amenities/i, hits: 0 },
  ];

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    distribution[star] = (distribution[star] || 0) + 1;
    if (r.verifiedStay) verifiedCount += 1;
    if (r.tripType) {
      tripCounts[r.tripType] = (tripCounts[r.tripType] || 0) + 1;
    }
    const text = `${r.title || ""} ${r.comment || ""}`;
    for (const aspect of aspectMentions) {
      if (aspect.regex.test(text)) aspect.hits += 1;
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
    const avg =
      reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
    const sentiment =
      avg >= 4.5
        ? "Guests consistently praise this property as exceptional"
        : avg >= 3.8
        ? "Guests report a positive and comfortable stay overall"
        : "Guest feedback highlights mixed experiences";
    const highlightText =
      praisedHighlights.length > 0
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

export const getReviewsByHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hotelId } = req.params;
    const [reviews, hotel] = await Promise.all([
      Review.find({ hotelId }).sort({ createdAt: -1 }),
      Hotel.findById(hotelId, { name: 1 }),
    ]);

    const summary = buildLocalReviewHighlights(reviews);

    // Upgrade summary with Gemini 3.8 Flash Free Tier (cached per review state)
    if (reviews.length > 0 && isGeminiConfigured()) {
      try {
        const latestStamp = reviews[0]?.updatedAt
          ? new Date(reviews[0].updatedAt).getTime()
          : reviews.length;
        const cacheKey = `${hotelId}:${reviews.length}:${latestStamp}`;
        const reviewsText = reviews
          .slice(0, 12)
          .map(
            (r) =>
              `[${r.rating}/5, ${r.tripType}] ${r.title ? r.title + ": " : ""}${
                r.comment
              }`
          )
          .join("\n");

        const geminiSummary = await summarizeReviewsWithGemini({
          cacheKey,
          hotelName: hotel?.name || "StayLux Hotel",
          reviewsText,
        });
        if (geminiSummary) {
          summary.aiSummary = geminiSummary;
        }
      } catch (err: any) {
        console.warn("Gemini review summary fallback:", err?.message ?? err);
      }
    }

    res.status(200).json({ reviews, summary });
  } catch (error) {
    next(error);
  }
};

export const upsertReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = CreateReviewDTO.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }

    const userId = (req as any)?.auth?.userId;
    const data = parsed.data;

    const hotel = await Hotel.findById(data.hotelId);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }

    const hasStay = await Booking.exists({
      hotelId: data.hotelId,
      userId,
      status: { $ne: "Canceled" },
    });

    const existingReview = await Review.findOne({
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
      const updatedAvg =
        (currentAvg * currentCount - oldRating + data.rating) / currentCount;
      hotel.rating = Number(Math.min(5, Math.max(1, updatedAvg)).toFixed(1));
      await hotel.save();
    } else {
      savedReview = await Review.create({
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
      const newRating =
        prevCount > 0
          ? (prevRating * prevCount + data.rating) / newCount
          : data.rating;

      hotel.reviews = newCount;
      hotel.rating = Number(Math.min(5, Math.max(1, newRating)).toFixed(1));
      await hotel.save();
    }

    upsertHotelVector(hotel).catch(() => {});

    res.status(201).json({
      message: existingReview ? "Review updated" : "Review submitted",
      review: savedReview,
      hotelRating: hotel.rating,
      hotelReviewsCount: hotel.reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const requesterId = (req as any)?.auth?.userId;
    const adminAllowed = await checkIsAdminRequest(req);

    const review = await Review.findById(id);
    if (!review) {
      throw new NotFoundError("Review not found");
    }

    if (review.userId !== requesterId && !adminAllowed) {
      throw new ForbiddenError("You can only delete your own review");
    }

    await Review.findByIdAndDelete(id);
    res.status(200).json({ message: "Review deleted" });
  } catch (error) {
    next(error);
  }
};
