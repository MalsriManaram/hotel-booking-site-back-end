import express from "express";
import {
  createBooking,
  getBookingsbyUserId,
  cancelBooking,
  getBookingsbyHotelId,
  getAllBookings,
  updateBookingStatusAdmin,
  validatePromoEndpoint,
} from "./../application/booking";
import { isAuthenticated } from "./middlewares/authentication-middleware";
import { isAdmin } from "./middlewares/authorization-middleware";

const bookingRouter = express.Router();

bookingRouter
  .route("/")
  .get(isAuthenticated, isAdmin, getAllBookings)
  .post(isAuthenticated, createBooking);

bookingRouter.route("/promo/validate").post(validatePromoEndpoint);
bookingRouter.route("/cancel").post(isAuthenticated, cancelBooking);
bookingRouter
  .route("/hotels/:id")
  .get(isAuthenticated, isAdmin, getBookingsbyHotelId);
bookingRouter.route("/users/:id").get(isAuthenticated, getBookingsbyUserId);
bookingRouter
  .route("/:id/status")
  .patch(isAuthenticated, isAdmin, updateBookingStatusAdmin);

export default bookingRouter;
