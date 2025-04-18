// dtos means domain transfer objects

import { z } from "zod";

export const CreateHotelDTO = z.object({
    name: z.string(), 
    location: z.string(),
    image: z.string(),
    price: z.string(),
    description: z.string(),
});
