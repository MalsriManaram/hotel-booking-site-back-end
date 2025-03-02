import express from "express";
import { createBooking, getAllBookingsForHotel, getAllBookings } from "../application/booking.js";



const bookingRouter = express.Router();

// Create a booking route
bookingRouter.route("/").post(createBooking).get(getAllBookings);
bookingRouter.route("/hotels/:hotelId").get(getAllBookingsForHotel);

// Export the router
export default bookingRouter;