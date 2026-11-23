import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, hotelId: 1 }, { unique: true });

export default mongoose.model("Wishlist", wishlistSchema);
