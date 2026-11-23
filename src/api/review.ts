import express from "express";
import {
  getReviewsByHotel,
  upsertReview,
  deleteReview,
} from "../application/review";
import { isAuthenticated } from "./middlewares/authentication-middleware";

const reviewRouter = express.Router();

reviewRouter.route("/hotel/:hotelId").get(getReviewsByHotel);
reviewRouter.route("/").post(isAuthenticated, upsertReview);
reviewRouter.route("/:id").delete(isAuthenticated, deleteReview);

export default reviewRouter;
