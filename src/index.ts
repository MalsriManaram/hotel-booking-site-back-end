import express from "express";
import "dotenv/config";
import connectDB from "./infrastructure/db";

// Import the middlewares
import GlobalErrorHandlingMiddleware from "./api/middlewares/global-error-handling-middleware";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

// Import the routers
import hotelsRouter from "./api/hotel";
import bookingRouter from "./api/booking";

// Create an Express instance
const app = express();

//use pre-middleware
app.use(clerkMiddleware());
app.use(express.json());
app.use(
  cors({ origin: "https://staylux-hotel-booking-system-malsri.netlify.app" })
); // Middleware to allow cross-origin requests

app.use("/api/hotels/", hotelsRouter);
app.use("/api/bookings/", bookingRouter);

// use post-middleware
app.use(GlobalErrorHandlingMiddleware); // post-middleware for error handling
connectDB();

// Define the port to run the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
