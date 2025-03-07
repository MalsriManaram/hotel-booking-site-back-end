import { Request, Response } from "express";
import Hotel from "./../infrastructure/schemas/Hotel";


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get all hotels logic
export const getAllHotels = async (req: Request, res: Response) => {
    const hotels =  await Hotel.find();
    res.status(200).json(hotels);
    return;
}

// Get a specific hotel logic
export const getHotelById = async (req: Request, res: Response) => {
    const hotelId = req.params.id;
    const hotel = await Hotel.findById(hotelId);

    // Validate the request
    if(!hotel){
        res.status(404).send();
        return;
    }
    res.status(200).json(hotel);
    return;
}

// Add a new hotel logic
export const createHotel = async (req: Request, res: Response) => {
    const hotel = req.body;
  
    // Validate the request data
    if (
      !hotel.name ||
      !hotel.location ||
      !hotel.rating ||
      !hotel.reviews ||
      !hotel.image ||
      !hotel.price ||
      !hotel.description
    ) {
      res.status(400).json({
        message: "Please enter all required fields",
      });
      return;
    }
  
    // Add the hotel
    await Hotel.create({
      name: hotel.name,
      location: hotel.location,
      rating: parseFloat(hotel.rating),
      reviews: parseInt(hotel.reviews),
      image: hotel.image,
      price: parseInt(hotel.price),
      description: hotel.description,
    });
  
    // Return the response
    res.status(201).send();
    return;
  };

// Delete a hotel logic
export const deleteHotel = async (req: Request, res: Response) => {
    const hotelId = req.params.id;

    // Delete the hotel
    await Hotel.findByIdAndDelete(hotelId);

    // Return the response
    res.status(200).send();
    return;
};

// Update a hotel logic
export const updateHotel = async (req: Request, res: Response) => {
    const hotelId = req.params.id;
    const updatedHotel = req.body;

    // Validate the request data
    if (
        !updatedHotel.name ||
        !updatedHotel.location ||
        !updatedHotel.rating ||
        !updatedHotel.reviews ||
        !updatedHotel.image ||
        !updatedHotel.price ||
        !updatedHotel.description
    ) {
        res.status(400).send();
        return;
    }

    // Update the hotel
    await Hotel.findByIdAndUpdate(hotelId, updatedHotel);

    // Return the response
    res.status(200).send();
    return;
};