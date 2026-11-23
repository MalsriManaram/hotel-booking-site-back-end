"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const db_1 = __importDefault(require("./infrastructure/db"));
const global_error_handling_middleware_1 = __importDefault(require("./api/middlewares/global-error-handling-middleware"));
const cors_1 = __importDefault(require("cors"));
const express_2 = require("@clerk/express");
const hotel_1 = __importDefault(require("./api/hotel"));
const booking_1 = __importDefault(require("./api/booking"));
const contact_1 = __importDefault(require("./api/contact"));
const review_1 = __importDefault(require("./api/review"));
const wishlist_1 = __importDefault(require("./api/wishlist"));
const app = (0, express_1.default)();
const allowedOrigins = [
    "https://staylux-hotel-booking-system-malsri.netlify.app",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((u) => u.trim())
        : []),
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin ||
            allowedOrigins.includes(origin) ||
            /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
            /\.netlify\.app$|\.vercel\.app$/.test(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Origin not allowed by CORS"));
        }
    },
    credentials: true,
}));
app.use((0, express_2.clerkMiddleware)());
app.use(express_1.default.json({ limit: "10mb" }));
app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "StayLux Backend API" });
});
app.use("/api/hotels", hotel_1.default);
app.use("/api/bookings", booking_1.default);
app.use("/api/contacts", contact_1.default);
app.use("/api/reviews", review_1.default);
app.use("/api/wishlists", wishlist_1.default);
app.use(global_error_handling_middleware_1.default);
(0, db_1.default)();
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
