import express from "express";
import "dotenv/config";
import connectDB from "./infrastructure/db.js";

// Import the routers
import hotelsRouter from './api/hotel.js';
import userRouter from "./api/user.js";
import bookingRouter from "./api/booking.js";

// Create an Express instance
const app = express();

// Middleware to parse JSON data in the request body
app.use(express.json());

// Use the hotels router for all routes starting with /api/hotels
app.use("/api/hotels/", hotelsRouter);
// Use the user router for all routes starting with /api/users
app.use("/api/users/", userRouter);
// Use the booking router for all routes starting with /api/bookings
app.use("/api/bookings/", bookingRouter);


// Connect to the database
connectDB();

// Define the port to run the server
const PORT = 8000;
app.listen(PORT, console.log(`Server is running on port ${PORT}...`));





