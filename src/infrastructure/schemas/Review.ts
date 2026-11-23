import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userAvatar: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      default: "",
      trim: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    tripType: {
      type: String,
      enum: ["Couple", "Family", "Solo", "Business", "Friends"],
      default: "Couple",
    },
    verifiedStay: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ hotelId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
