import express from "express";
import "dotenv/config";
import connectDB from "./infrastructure/db";
import cors from "cors";

// Import the routers
import hotelsRouter from './api/hotel';
import userRouter from "./api/user";
import bookingRouter from "./api/booking";

// Create an Express instance
const app = express();

// Middleware to parse JSON data in the request body
app.use(express.json());
// Middleware to allow cross-origin requests
app.use(cors());

// Connect to the database
connectDB();



// Use the hotels router for all routes starting with /api/hotels
app.use("/api/hotels/", hotelsRouter);
// Use the user router for all routes starting with /api/users
app.use("/api/users/", userRouter);
// Use the booking router for all routes starting with /api/bookings
app.use("/api/bookings/", bookingRouter);




// Define the port to run the server
const PORT = 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}...`));





