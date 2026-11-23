import express from "express";
import { getUserWishlist, toggleWishlist } from "../application/wishlist";
import { isAuthenticated } from "./middlewares/authentication-middleware";

const wishlistRouter = express.Router();

wishlistRouter.route("/").get(isAuthenticated, getUserWishlist);
wishlistRouter.route("/toggle").post(isAuthenticated, toggleWishlist);

export default wishlistRouter;
