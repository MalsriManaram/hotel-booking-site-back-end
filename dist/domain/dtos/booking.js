"use strict";
// dtos means domain transfer objects
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBookingDTO = void 0;
const zod_1 = require("zod");
exports.CreateBookingDTO = zod_1.z.object({
    hotelId: zod_1.z.string(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    email: zod_1.z.string(),
    phone: zod_1.z.string(),
    arrivalDate: zod_1.z.string(),
    departureDate: zod_1.z.string(),
    roomType: zod_1.z.string(),
    adults: zod_1.z.number(),
    children: zod_1.z.number(),
    specialRequests: zod_1.z.string().optional(),
    payment: zod_1.z.number(),
});
