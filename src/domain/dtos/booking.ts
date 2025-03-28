// dtos means domain transfer objects

import { z } from "zod";

export const CreateBookingDTO = z.object({
    hotelId: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    phone: z.string(),
    arrivalDate: z.string(),
    departureDate: z.string(),
    roomType: z.string(),
    adults: z.number(),
    children: z.number(),
    specialRequests: z.string().optional(),
    payment: z.number(),
});
