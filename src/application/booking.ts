import { Request, Response } from "express";
import Booking from "./../infrastructure/schemas/Booking";

// Create a booking
export const createBooking = async (req: Request, res: Response) => {
  const booking = req.body;

  // Validate the request data
  if (!booking.hotelId || !booking.userId || !booking.checkIn || !booking.checkOut || !booking.roomNumber) {
    res.status(400).send();
    return;
  }

  // Add the booking
  await Booking.create({
    hotelId: booking.hotelId,
    userId: booking.userId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    roomNumber: booking.roomNumber,
  });

  // Return the response
  res.status(201).send();
  return;
};  

// Get all bookings
export const getAllBookings = async (req: Request, res: Response) => {
  const bookings = await Booking.find();
  res.status(200).json({bookings});
  return;
};

// Get all bookings for a one hotel
export const getAllBookingsForHotel = async (req: Request, res: Response) => {
  const hotelId = req.params.hotelId;
  const bookings = await Booking.find({hotelId}).populate("hotelId").populate("userId"); 
  res.status(200).json(
    bookings.map((booking) => ({
      ...booking.toObject(), 
      userId: booking.userId._id, 
      user: booking.userId,
    }))
  );
   
  return;
};


// // Delete a booking
// export const deleteBooking = async (req: Request, res: Response) => {
//   const bookingId = req.params.id;

//   // Delete the booking
//   await Booking.findByIdAndDelete(bookingId);

//   // Return the response
//   res.status(200).send();
//   return;
// }; 
