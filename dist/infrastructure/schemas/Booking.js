"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bookingSchema = new mongoose_1.default.Schema({
    hotelId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
        ref: "Hotel",
    },
    userId: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    arrivalDate: {
        type: Date,
        required: true,
    },
    departureDate: {
        type: Date,
        required: true,
    },
    roomType: {
        type: String,
        required: true,
    },
    adults: {
        type: Number,
        required: true,
    },
    children: {
        type: Number,
        required: true,
    },
    specialRequests: {
        type: String,
        default: "",
    },
    payment: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Booking", bookingSchema);
