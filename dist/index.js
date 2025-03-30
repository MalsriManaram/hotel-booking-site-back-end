"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const db_1 = __importDefault(require("./infrastructure/db"));
// Import the middlewares
const global_error_handling_middleware_1 = __importDefault(require("./api/middlewares/global-error-handling-middleware")); // Import the GlobalErrorHandlingMiddleware for error handling
const cors_1 = __importDefault(require("cors")); // Import the cors middleware to allow cross-origin requests
const express_2 = require("@clerk/express"); // Import the clerkMiddleware to authenticate the user
// Import the routers
const hotel_1 = __importDefault(require("./api/hotel"));
const booking_1 = __importDefault(require("./api/booking"));
// Create an Express instance
const app = (0, express_1.default)();
//use pre-middleware
app.use((0, express_2.clerkMiddleware)()); // clerkMiddleware to authenticate the user
app.use(express_1.default.json()); // Middleware to parse JSON data in the request body
app.use((0, cors_1.default)({ origin: "https://staylux-hotel-booking-system-malsri.netlify.app" })); // Middleware to allow cross-origin requests
app.use("/api/hotels/", hotel_1.default); // Use the hotels router for all routes starting with /api/hotels
app.use("/api/bookings/", booking_1.default); // Use the booking router for all routes starting with /api/bookings
// use post-middleware
app.use(global_error_handling_middleware_1.default); // post-middleware for error handling
(0, db_1.default)(); // Connect to the database
// Define the port to run the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
