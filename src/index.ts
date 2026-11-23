import express from "express";
import "dotenv/config";
import connectDB from "./infrastructure/db";

import GlobalErrorHandlingMiddleware from "./api/middlewares/global-error-handling-middleware";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import hotelsRouter from "./api/hotel";
import bookingRouter from "./api/booking";
import contactRouter from "./api/contact";
import reviewRouter from "./api/review";
import wishlistRouter from "./api/wishlist";

const app = express();

const allowedOrigins = [
  "https://staylux-hotel-booking-system-malsri.netlify.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((u) => u.trim())
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.netlify\.app$|\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(clerkMiddleware());
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "StayLux Backend API" });
});

app.use("/api/hotels", hotelsRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/wishlists", wishlistRouter);

app.use(GlobalErrorHandlingMiddleware);
connectDB();

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
