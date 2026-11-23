"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateHotelDTO = exports.CreateHotelDTO = exports.HotelPoliciesDTO = exports.RoomTypeDTO = void 0;
const zod_1 = require("zod");
exports.RoomTypeDTO = zod_1.z.object({
    type: zod_1.z.enum(["single", "double", "deluxe", "suite"]),
    name: zod_1.z.string().min(1),
    price: zod_1.z.coerce.number().min(1),
    capacityAdults: zod_1.z.coerce.number().min(1).default(2),
    capacityChildren: zod_1.z.coerce.number().min(0).default(2),
    totalRooms: zod_1.z.coerce.number().min(1).default(4),
});
exports.HotelPoliciesDTO = zod_1.z.object({
    checkIn: zod_1.z.string().default("14:00"),
    checkOut: zod_1.z.string().default("11:00"),
    freeCancellationHours: zod_1.z.coerce.number().min(0).default(48),
});
exports.CreateHotelDTO = zod_1.z.object({
    name: zod_1.z.string().min(1, "Hotel name is required"),
    location: zod_1.z.string().min(1, "Location is required"),
    image: zod_1.z.string().min(1, "Cover image is required"),
    images: zod_1.z.array(zod_1.z.string().min(1)).optional(),
    price: zod_1.z.coerce.number().min(1, "Price must be greater than 0"),
    description: zod_1.z.string().min(5, "Description must be at least 5 characters"),
    amenities: zod_1.z.array(zod_1.z.string()).optional(),
    roomTypes: zod_1.z.array(exports.RoomTypeDTO).optional(),
    policies: exports.HotelPoliciesDTO.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.UpdateHotelDTO = exports.CreateHotelDTO.partial();
