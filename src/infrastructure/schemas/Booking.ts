import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    hotelId: {
        type: mongoose.Schema.Types.ObjectId,
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
}, { timestamps: true });

export default mongoose.model("Booking", bookingSchema);
