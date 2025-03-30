"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const booking_1 = require("./../application/booking");
const authentication_middleware_1 = require("./middlewares/authentication-middleware");
const bookingRouter = express_1.default.Router();
// Create a booking route
bookingRouter.route("/").post(authentication_middleware_1.isAuthenticated, booking_1.createBooking);
bookingRouter.route("/cancel/").post(booking_1.cancelBooking);
bookingRouter.route("/hotels/:id").get(booking_1.getBookingsbyHotelId);
bookingRouter.route("/users/:id").get(booking_1.getBookingsbyUserId);
// Export the router
exports.default = bookingRouter;
