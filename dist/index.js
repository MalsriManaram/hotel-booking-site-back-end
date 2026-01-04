"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const db_1 = __importDefault(require("./infrastructure/db"));
// Import the middlewares
const global_error_handling_middleware_1 = __importDefault(require("./api/middlewares/global-error-handling-middleware"));
const cors_1 = __importDefault(require("cors"));
const express_2 = require("@clerk/express");
// Import the routers
const hotel_1 = __importDefault(require("./api/hotel"));
const booking_1 = __importDefault(require("./api/booking"));
// Create an Express instance
const app = (0, express_1.default)();
//use pre-middleware
app.use((0, express_2.clerkMiddleware)());
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: "https://staylux-hotel-booking-system-malsri.netlify.app" })); // Middleware to allow cross-origin requests
app.use("/api/hotels/", hotel_1.default);
app.use("/api/bookings/", booking_1.default);
// use post-middleware
app.use(global_error_handling_middleware_1.default); // post-middleware for error handling
(0, db_1.default)();
// Define the port to run the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
