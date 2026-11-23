"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const wishlistSchema = new mongoose_1.default.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    hotelId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Hotel",
        required: true,
    },
}, { timestamps: true });
wishlistSchema.index({ userId: 1, hotelId: 1 }, { unique: true });
exports.default = mongoose_1.default.model("Wishlist", wishlistSchema);
