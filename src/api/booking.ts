import express from "express";
import { createBooking, getAllBookingsForHotel, getAllBookings } from "./../application/booking";
import { isAuthenticated } from "./middlewares/authentication-middleware";



const bookingRouter = express.Router();

// Create a booking route
bookingRouter.route("/").post(isAuthenticated, createBooking).get(getAllBookings);
bookingRouter.route("/hotels/:hotelId").get(getAllBookingsForHotel);

// Export the router
export default bookingRouter;