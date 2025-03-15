import express from "express";
import "dotenv/config";
import connectDB from "./infrastructure/db";


// Import the middlewares
import GlobalErrorHandlingMiddleware from "./api/middlewares/global-error-handling-middleware"; // Import the GlobalErrorHandlingMiddleware for error handling
import cors from "cors"; // Import the cors middleware to allow cross-origin requests
import { clerkMiddleware } from "@clerk/express"; // Import the clerkMiddleware to authenticate the user

// Import the routers
import hotelsRouter from './api/hotel';
import bookingRouter from "./api/booking";


// Create an Express instance
const app = express();

//use pre-middleware
app.use(clerkMiddleware()); // clerkMiddleware to authenticate the user
app.use(express.json()); // Middleware to parse JSON data in the request body
app.use(cors()); // Middleware to allow cross-origin requests

connectDB(); // Connect to the database




app.use("/api/hotels/", hotelsRouter); // Use the hotels router for all routes starting with /api/hotels
app.use("/api/bookings/", bookingRouter); // Use the booking router for all routes starting with /api/bookings


// use post-middleware
app.use(GlobalErrorHandlingMiddleware); // post-middleware for error handling

// Define the port to run the server
const PORT = 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}...`));





