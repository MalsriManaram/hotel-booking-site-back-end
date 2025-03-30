import express from "express";
import { createBooking, getBookingsbyUserId, cancelBooking, getBookingsbyHotelId } from "./../application/booking";
import { isAuthenticated } from "./middlewares/authentication-middleware";



const bookingRouter = express.Router();

// Create a booking route
bookingRouter.route("/").post(isAuthenticated, createBooking);
bookingRouter.route("/cancel/").post(cancelBooking);
bookingRouter.route("/hotels/:id").get(getBookingsbyHotelId);
bookingRouter.route("/users/:id").get(getBookingsbyUserId);




// Export the router
export default bookingRouter;