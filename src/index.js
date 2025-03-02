import express from "express";
import "dotenv/config";
import hotelsRouter from './api/hotel.js';
import { connect } from "mongoose";
import connectDB from "./infrastructure/db.js";


// Create an Express instance
const app = express();

// Middleware to parse JSON data in the request body
app.use(express.json());

// Use the hotels router for all routes starting with /api/hotels
app.use("/api/hotels/", hotelsRouter);

connectDB();

// Define the port to run the server
const PORT = 8000;
app.listen(PORT, console.log(`Server is running on port ${PORT}...`));





