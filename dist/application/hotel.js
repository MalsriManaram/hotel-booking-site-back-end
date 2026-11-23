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
exports.getAdminDashboardStats = exports.updateHotel = exports.deleteHotel = exports.createHotel = exports.getHotelAvailability = exports.getHotelById = exports.getHotelLocations = exports.getAllHotels = void 0;
const Hotel_1 = __importStar(require("./../infrastructure/schemas/Hotel"));
const Booking_1 = __importDefault(require("../infrastructure/schemas/Booking"));
const Contact_1 = __importDefault(require("../infrastructure/schemas/Contact"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
const validation_error_1 = __importDefault(require("../domain/errors/validation-error"));
const hotel_1 = require("../domain/dtos/hotel");
const embedding_1 = require("./embedding");
const getAllHotels = async (req, res, next) => {
    try {
        const hotels = await Hotel_1.default.find().sort({ createdAt: -1 });
        res.status(200).json(hotels.map(Hotel_1.normalizeHotelDoc));
    }
    catch (error) {
        next(error);
    }
};
exports.getAllHotels = getAllHotels;
const getHotelLocations = async (req, res, next) => {
    try {
        const hotels = await Hotel_1.default.find({}, { location: 1 });
        const countries = new Set();
        hotels.forEach((h) => {
            if (!h.location)
                return;
            const parts = h.location.split(",").map((p) => p.trim());
            const countryOrCity = parts[parts.length - 1] || h.location.trim();
            if (countryOrCity)
                countries.add(countryOrCity);
        });
        res.status(200).json({ locations: ["ALL", ...Array.from(countries)] });
    }
    catch (error) {
        next(error);
    }
};
exports.getHotelLocations = getHotelLocations;
const getHotelById = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const hotel = await Hotel_1.default.findById(hotelId);
        if (!hotel) {
            throw new not_found_error_1.default("Hotel not found");
        }
        res.status(200).json((0, Hotel_1.normalizeHotelDoc)(hotel));
    }
    catch (error) {
        next(error);
    }
};
exports.getHotelById = getHotelById;
// Privacy-safe public endpoint returning ONLY date & room-type availability (zero guest PII)
const getHotelAvailability = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const hotelDoc = await Hotel_1.default.findById(hotelId);
        if (!hotelDoc) {
            throw new not_found_error_1.default("Hotel not found");
        }
        const hotel = (0, Hotel_1.normalizeHotelDoc)(hotelDoc);
        const roomTypes = hotel.roomTypes || (0, Hotel_1.buildDefaultRoomTypes)(hotel.price);
        const activeBookings = await Booking_1.default.find({
            hotelId,
            status: { $ne: "Canceled" },
            departureDate: { $gte: new Date(Date.now() - 86400000) },
        }, { arrivalDate: 1, departureDate: 1, roomType: 1 });
        // Count booked rooms per YYYY-MM-DD per roomType
        const dateRoomCounts = {};
        for (const b of activeBookings) {
            const start = new Date(b.arrivalDate);
            const end = new Date(b.departureDate);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            const cursor = new Date(start);
            // Hotel night occupancy runs from arrivalDate up to (departureDate - 1 night)
            while (cursor < end) {
                const key = cursor.toISOString().slice(0, 10);
                if (!dateRoomCounts[key])
                    dateRoomCounts[key] = {};
                const rType = (b.roomType || "single").toLowerCase();
                dateRoomCounts[key][rType] = (dateRoomCounts[key][rType] || 0) + 1;
                cursor.setDate(cursor.getDate() + 1);
            }
        }
        const unavailableDatesByRoomType = {};
        for (const rt of roomTypes) {
            unavailableDatesByRoomType[rt.type] = [];
        }
        const fullyBookedDates = [];
        for (const [dateKey, counts] of Object.entries(dateRoomCounts)) {
            let allTypesFull = true;
            for (const rt of roomTypes) {
                const bookedCount = counts[rt.type] || 0;
                if (bookedCount >= (rt.totalRooms || 1)) {
                    unavailableDatesByRoomType[rt.type].push(dateKey);
                }
                else {
                    allTypesFull = false;
                }
            }
            if (allTypesFull) {
                fullyBookedDates.push(dateKey);
            }
        }
        res.status(200).json({
            hotelId,
            roomTypes,
            unavailableDatesByRoomType,
            fullyBookedDates,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getHotelAvailability = getHotelAvailability;
const createHotel = async (req, res, next) => {
    try {
        const parsed = hotel_1.CreateHotelDTO.safeParse(req.body);
        if (!parsed.success) {
            throw new validation_error_1.default(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
        }
        const data = parsed.data;
        const roomTypes = data.roomTypes && data.roomTypes.length > 0
            ? data.roomTypes
            : (0, Hotel_1.buildDefaultRoomTypes)(data.price);
        const images = data.images && data.images.length > 0
            ? Array.from(new Set([data.image, ...data.images]))
            : [data.image];
        const tags = (0, Hotel_1.inferSmartTags)({
            description: data.description,
            price: data.price,
            amenities: data.amenities,
            tags: data.tags,
        });
        const created = await Hotel_1.default.create({
            name: data.name,
            location: data.location,
            image: data.image,
            images,
            price: data.price,
            description: data.description,
            amenities: data.amenities && data.amenities.length > 0
                ? data.amenities
                : undefined,
            roomTypes,
            policies: data.policies,
            tags,
        });
        // Non-blocking vector sync
        (0, embedding_1.upsertHotelVector)(created).catch((err) => console.warn("Vector sync warning on createHotel:", err?.message ?? err));
        res.status(201).json((0, Hotel_1.normalizeHotelDoc)(created));
    }
    catch (error) {
        next(error);
    }
};
exports.createHotel = createHotel;
const deleteHotel = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const deleted = await Hotel_1.default.findByIdAndDelete(hotelId);
        if (!deleted) {
            throw new not_found_error_1.default("Hotel not found");
        }
        (0, embedding_1.removeHotelVector)(hotelId).catch((err) => console.warn("Vector cleanup warning on deleteHotel:", err?.message ?? err));
        res.status(200).json({ message: "Hotel deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteHotel = deleteHotel;
const updateHotel = async (req, res, next) => {
    try {
        const hotelId = req.params.id;
        const parsed = hotel_1.UpdateHotelDTO.safeParse(req.body);
        if (!parsed.success) {
            throw new validation_error_1.default(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
        }
        const existing = await Hotel_1.default.findById(hotelId);
        if (!existing) {
            throw new not_found_error_1.default("Hotel not found");
        }
        const updatePayload = { ...parsed.data };
        if (updatePayload.image && updatePayload.images) {
            updatePayload.images = Array.from(new Set([updatePayload.image, ...updatePayload.images]));
        }
        const updated = await Hotel_1.default.findByIdAndUpdate(hotelId, updatePayload, {
            new: true,
        });
        if (updated) {
            (0, embedding_1.upsertHotelVector)(updated).catch((err) => console.warn("Vector sync warning on updateHotel:", err?.message ?? err));
        }
        res.status(200).json((0, Hotel_1.normalizeHotelDoc)(updated));
    }
    catch (error) {
        next(error);
    }
};
exports.updateHotel = updateHotel;
const getAdminDashboardStats = async (req, res, next) => {
    try {
        const [hotelsCount, bookings, unreadContactsCount] = await Promise.all([
            Hotel_1.default.countDocuments(),
            Booking_1.default.find().populate({ path: "hotelId", model: "Hotel" }),
            Contact_1.default.countDocuments({ status: { $ne: "resolved" } }),
        ]);
        const now = new Date();
        let totalRevenue = 0;
        let ongoingCount = 0;
        let completedCount = 0;
        let canceledCount = 0;
        let whatsappPendingCount = 0;
        for (const b of bookings) {
            const amount = Number(b.payment) || 0;
            if (b.status === "Canceled") {
                canceledCount += 1;
            }
            else {
                totalRevenue += amount;
                if (b.status === "Completed" ||
                    (b.departureDate && new Date(b.departureDate) < now)) {
                    completedCount += 1;
                }
                else {
                    ongoingCount += 1;
                }
                if (b.paymentStatus === "Pending_WhatsApp") {
                    whatsappPendingCount += 1;
                }
            }
        }
        res.status(200).json({
            hotelsCount,
            totalBookings: bookings.length,
            totalRevenue,
            ongoingCount,
            completedCount,
            canceledCount,
            whatsappPendingCount,
            unreadContactsCount,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminDashboardStats = getAdminDashboardStats;
