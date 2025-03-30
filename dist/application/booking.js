"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllBookings = exports.cancelBooking = exports.getBookingsbyUserId = exports.getBookingsbyHotelId = exports.createBooking = void 0;
const Booking_1 = __importDefault(require("../infrastructure/schemas/Booking"));
const booking_1 = require("../domain/dtos/booking");
const validation_error_1 = __importDefault(require("../domain/errors/validation-error"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
// Create a booking
const createBooking = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const booking = booking_1.CreateBookingDTO.safeParse(req.body);
        // Validate the request data
        if (!booking.success) {
            throw new validation_error_1.default(booking.error.message);
        }
        // Get the user from the request
        const user = req.auth;
        // Add the booking
        yield Booking_1.default.create({
            hotelId: booking.data.hotelId,
            userId: user.userId,
            firstName: booking.data.firstName,
            lastName: booking.data.lastName,
            email: booking.data.email,
            phone: booking.data.phone,
            arrivalDate: booking.data.arrivalDate,
            departureDate: booking.data.departureDate,
            roomType: booking.data.roomType,
            adults: booking.data.adults,
            children: booking.data.children,
            specialRequests: booking.data.specialRequests,
            payment: booking.data.payment,
            status: "Ongoing",
        });
        // Return the response
        res.status(201).send();
    }
    catch (error) {
        next(error);
    }
});
exports.createBooking = createBooking;
// Get all bookings for a specific hotel
const getBookingsbyHotelId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Fetch all the bookings for the a specific hotel from the database
        const bookings = yield Booking_1.default.find({ hotelId: id });
        // Send the bookings data
        res.json({ bookings });
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.getBookingsbyHotelId = getBookingsbyHotelId;
// Get all hotels for a specific user
const getBookingsbyUserId = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Fetch bookings for the user and populate the hotel data completely
        const bookings = yield Booking_1.default.find({ userId: id }).populate({
            path: "hotelId",
            model: "Hotel"
        });
        // If no bookings are found
        if (!bookings || bookings.length === 0) {
            throw new not_found_error_1.default("No bookings found for this user");
        }
        // Send the bookings data
        res.json({ bookings });
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.getBookingsbyUserId = getBookingsbyUserId;
// Cancel a booking
const cancelBooking = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookingId, userId } = req.body;
        const booking = yield Booking_1.default.findOne({ _id: bookingId, userId });
        if (!booking) {
            throw new not_found_error_1.default("Booking not found or does not belong to the user");
        }
        if (booking.status === "Canceled") {
            throw new not_found_error_1.default("Booking is already canceled");
        }
        booking.status = "Canceled";
        yield booking.save();
        res.status(200).json({ message: "Booking successfully canceled" });
    }
    catch (error) {
        next(error);
    }
});
exports.cancelBooking = cancelBooking;
// Get all bookings
const getAllBookings = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bookings = yield Booking_1.default.find();
        res.status(200).json(bookings);
        return;
    }
    catch (error) {
        next(error);
    }
});
exports.getAllBookings = getAllBookings;
