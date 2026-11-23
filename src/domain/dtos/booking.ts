import { z } from "zod";

export const CreateBookingDTO = z.object({
  hotelId: z.string().min(1, "Hotel ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(7, "Valid phone number is required"),
  arrivalDate: z.string().min(1, "Arrival date is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  roomType: z.string().min(1, "Room type is required"),
  adults: z.coerce.number().min(1, "At least 1 adult is required"),
  children: z.coerce.number().min(0).default(0),
  specialRequests: z.string().optional().default(""),
  promoCode: z.string().optional().default(""),
  paymentMethod: z
    .enum(["whatsapp", "pay_at_hotel", "payhere_sandbox"])
    .optional()
    .default("whatsapp"),
  payment: z.coerce.number().optional(),
});
