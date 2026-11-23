"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const reviewSchema = new mongoose_1.default.Schema({
    hotelId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
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
}, { timestamps: true });
reviewSchema.index({ hotelId: 1, userId: 1 }, { unique: true });
exports.default = mongoose_1.default.model("Review", reviewSchema);
