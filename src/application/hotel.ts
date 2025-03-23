import { NextFunction, Request, Response } from "express";
import Hotel from "./../infrastructure/schemas/Hotel";
import NotFoundError from "../domain/errors/not-found-error";
import ValidationError from "../domain/errors/validation-error";
import { CreateHotelDTO } from "../domain/dtos/hotel";
import OpenAI from "openai";



const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get all hotels logic
export const getAllHotels = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotels =  await Hotel.find();
      res.status(200).json(hotels);
      return;

    } catch (error) {
      next(error);
    }
}

// Get a specific hotel logic
export const getHotelById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = req.params.id;
      const hotel = await Hotel.findById(hotelId);
  
      // Validate the request
      if(!hotel){
        throw new NotFoundError("Hotel not found");
      }
      res.status(200).json(hotel);
      return;

    } catch (error) {
      next(error);
    }
}

//  get a response from chatGPT.  
export const genarateResponse = async (req: Request, res: Response, next: NextFunction) =>{
    const { messages } = req.body;

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: messages.length === 1 ? 
                [ 
                  {
                    role: "system", 
                    content: "you are a assistant that work as a receptionist in a hotel and you are going to talk to users and help them find the right entertainment options."
                  },
                    ...messages,
                ]
              : messages,
      store: true,
  });

  // console.log(completion.choices[0].message);
  res.status(200).json({
    message: [
    ...messages,
    { role: "assistant", content: completion.choices[0].message.content},
  ] 
  });
};

// Add a new hotel logic
export const createHotel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotel = CreateHotelDTO.safeParse(req.body);
  
      // Validate the request data
      if (!hotel.success) {
        throw new ValidationError(hotel.error.message);
      }
    
      // Add the hotel
      await Hotel.create({
        name: hotel.data.name,
        location: hotel.data.location,
        image: hotel.data.image,
        price: parseInt(hotel.data.price),
        description: hotel.data.description,
      });
    
      // Return the response
      res.status(201).send();
      return;
      
    } catch (error) {
      next(error);
    }
  };

// Delete a hotel logic
export const deleteHotel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotelId = req.params.id;

      // Delete the hotel
      await Hotel.findByIdAndDelete(hotelId);
  
      // Return the response
      res.status(200).send();
      return;

    } catch (error) {
      next(error);
    }
};

// Update a hotel logic
export const updateHotel = async (req: Request, res: Response, next: NextFunction) => {
   try {
    const hotelId = req.params.id;
    const updatedHotel = req.body;

    // Validate the request data
    if (
        !updatedHotel.name ||
        !updatedHotel.location ||
        !updatedHotel.image ||
        !updatedHotel.price ||
        !updatedHotel.description
    ) {
       throw new ValidationError("Invalid hotel data");
    }

    // Update the hotel
    await Hotel.findByIdAndUpdate(hotelId, updatedHotel);

    // Return the response
    res.status(200).send();
    return;
    
   } catch (error) {
    next(error);
   }
};