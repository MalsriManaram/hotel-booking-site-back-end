"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBookingDTO = void 0;
const zod_1 = require("zod");
exports.CreateBookingDTO = zod_1.z.object({
    hotelId: zod_1.z.string().min(1, "Hotel ID is required"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    email: zod_1.z.string().email("Valid email is required"),
    phone: zod_1.z.string().min(7, "Valid phone number is required"),
    arrivalDate: zod_1.z.string().min(1, "Arrival date is required"),
    departureDate: zod_1.z.string().min(1, "Departure date is required"),
    roomType: zod_1.z.string().min(1, "Room type is required"),
    adults: zod_1.z.coerce.number().min(1, "At least 1 adult is required"),
    children: zod_1.z.coerce.number().min(0).default(0),
    specialRequests: zod_1.z.string().optional().default(""),
    promoCode: zod_1.z.string().optional().default(""),
    paymentMethod: zod_1.z
        .enum(["whatsapp", "pay_at_hotel", "payhere_sandbox"])
        .optional()
        .default("whatsapp"),
    payment: zod_1.z.coerce.number().optional(),
});
