"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleWishlist = exports.getUserWishlist = void 0;
const Wishlist_1 = __importDefault(require("../infrastructure/schemas/Wishlist"));
const Hotel_1 = __importStar(require("../infrastructure/schemas/Hotel"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
const getUserWishlist = async (req, res, next) => {
    try {
        const userId = req?.auth?.userId;
        const entries = await Wishlist_1.default.find({ userId })
            .populate({ path: "hotelId", model: "Hotel" })
            .sort({ createdAt: -1 });
        const hotels = entries
            .map((entry) => (entry.hotelId ? (0, Hotel_1.normalizeHotelDoc)(entry.hotelId) : null))
            .filter(Boolean);
        const hotelIds = hotels.map((h) => String(h._id));
        res.status(200).json({ hotels, hotelIds });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserWishlist = getUserWishlist;
const toggleWishlist = async (req, res, next) => {
    try {
        const userId = req?.auth?.userId;
        const { hotelId } = req.body;
        const hotelExists = await Hotel_1.default.exists({ _id: hotelId });
        if (!hotelExists) {
            throw new not_found_error_1.default("Hotel not found");
        }
        const existing = await Wishlist_1.default.findOne({ userId, hotelId });
        if (existing) {
            await Wishlist_1.default.findByIdAndDelete(existing._id);
            res.status(200).json({ saved: false, hotelId });
            return;
        }
        await Wishlist_1.default.create({ userId, hotelId });
        res.status(201).json({ saved: true, hotelId });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleWishlist = toggleWishlist;
