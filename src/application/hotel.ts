import { NextFunction, Request, Response } from "express";
import Hotel from "./../infrastructure/schemas/Hotel";
import NotFoundError from "../domain/not-found-error";
import ValidationError from "../domain/validation-error";


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

// Add a new hotel logic
export const createHotel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hotel = req.body;
  
      // Validate the request data
      if (
        !hotel.name ||
        !hotel.location ||
        !hotel.image ||
        !hotel.price ||
        !hotel.description
      ) {
       throw new ValidationError("Invalid hotel data");
      }
    
      // Add the hotel
      await Hotel.create({
        name: hotel.name,
        location: hotel.location,
        // rating: parseFloat(hotel.rating),
        // reviews: parseInt(hotel.reviews),
        image: hotel.image,
        price: parseInt(hotel.price),
        description: hotel.description,
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