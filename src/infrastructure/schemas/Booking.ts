import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingRef: {
      type: String,
      index: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Hotel",
    },
    userId: {
      type: String,
      required: true,
      index: true,
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
    promoCode: {
      type: String,
      default: "",
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    payment: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["whatsapp", "pay_at_hotel", "payhere_sandbox"],
      default: "whatsapp",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending_WhatsApp", "Pay_At_Hotel", "Paid", "Refunded"],
      default: "Pending_WhatsApp",
    },
    whatsappOrderUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
