"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const review_1 = require("../application/review");
const authentication_middleware_1 = require("./middlewares/authentication-middleware");
const reviewRouter = express_1.default.Router();
reviewRouter.route("/hotel/:hotelId").get(review_1.getReviewsByHotel);
reviewRouter.route("/").post(authentication_middleware_1.isAuthenticated, review_1.upsertReview);
reviewRouter.route("/:id").delete(authentication_middleware_1.isAuthenticated, review_1.deleteReview);
exports.default = reviewRouter;
