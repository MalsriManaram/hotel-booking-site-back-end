"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wishlist_1 = require("../application/wishlist");
const authentication_middleware_1 = require("./middlewares/authentication-middleware");
const wishlistRouter = express_1.default.Router();
wishlistRouter.route("/").get(authentication_middleware_1.isAuthenticated, wishlist_1.getUserWishlist);
wishlistRouter.route("/toggle").post(authentication_middleware_1.isAuthenticated, wishlist_1.toggleWishlist);
exports.default = wishlistRouter;
