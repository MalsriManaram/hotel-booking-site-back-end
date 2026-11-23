import { z } from "zod";

export const RoomTypeDTO = z.object({
  type: z.enum(["single", "double", "deluxe", "suite"]),
  name: z.string().min(1),
  price: z.coerce.number().min(1),
  capacityAdults: z.coerce.number().min(1).default(2),
  capacityChildren: z.coerce.number().min(0).default(2),
  totalRooms: z.coerce.number().min(1).default(4),
});

export const HotelPoliciesDTO = z.object({
  checkIn: z.string().default("14:00"),
  checkOut: z.string().default("11:00"),
  freeCancellationHours: z.coerce.number().min(0).default(48),
});

export const CreateHotelDTO = z.object({
  name: z.string().min(1, "Hotel name is required"),
  location: z.string().min(1, "Location is required"),
  image: z.string().min(1, "Cover image is required"),
  images: z.array(z.string().min(1)).optional(),
  price: z.coerce.number().min(1, "Price must be greater than 0"),
  description: z.string().min(5, "Description must be at least 5 characters"),
  amenities: z.array(z.string()).optional(),
  roomTypes: z.array(RoomTypeDTO).optional(),
  policies: HotelPoliciesDTO.optional(),
  tags: z.array(z.string()).optional(),
});

export const UpdateHotelDTO = CreateHotelDTO.partial();
