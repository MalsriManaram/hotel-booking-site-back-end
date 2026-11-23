"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const booking_1 = require("./../application/booking");
const authentication_middleware_1 = require("./middlewares/authentication-middleware");
const authorization_middleware_1 = require("./middlewares/authorization-middleware");
const bookingRouter = express_1.default.Router();
bookingRouter
    .route("/")
    .get(authentication_middleware_1.isAuthenticated, authorization_middleware_1.isAdmin, booking_1.getAllBookings)
    .post(authentication_middleware_1.isAuthenticated, booking_1.createBooking);
bookingRouter.route("/promo/validate").post(booking_1.validatePromoEndpoint);
bookingRouter.route("/cancel").post(authentication_middleware_1.isAuthenticated, booking_1.cancelBooking);
bookingRouter
    .route("/hotels/:id")
    .get(authentication_middleware_1.isAuthenticated, authorization_middleware_1.isAdmin, booking_1.getBookingsbyHotelId);
bookingRouter.route("/users/:id").get(authentication_middleware_1.isAuthenticated, booking_1.getBookingsbyUserId);
bookingRouter
    .route("/:id/status")
    .patch(authentication_middleware_1.isAuthenticated, authorization_middleware_1.isAdmin, booking_1.updateBookingStatusAdmin);
exports.default = bookingRouter;
