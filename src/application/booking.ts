import { Request, Response, NextFunction } from "express";
import Booking from "../infrastructure/schemas/Booking";
import { CreateBookingDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
import NotFoundError from "../domain/errors/not-found-error";
import { clerkClient } from "@clerk/express";

// Create a booking
export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = CreateBookingDTO.safeParse(req.body);

    // Validate the request data
    if (!booking.success) {
      throw new ValidationError(booking.error.message);
    }

    // Get the user from the request
    const user = (req as any).auth;
    
    // Add the booking
    await Booking.create({
      hotelId: booking.data.hotelId,
      userId: user.userId,
      firstName: booking.data.firstName,
      lastName: booking.data.lastName,
      email: booking.data.email,
      phone: booking.data.phone,
      arrivalDate: booking.data.arrivalDate,
      departureDate: booking.data.departureDate,
      roomType: booking.data.roomType,
      adults: booking.data.adults,
      children: booking.data.children,
      specialRequests: booking.data.specialRequests,
      payment: booking.data.payment,
      status: "Ongoing", 
    });

    // Return the response
    res.status(201).send();
  } catch (error) {
    next(error);
  }
};
// Get all bookings for a specific hotel
export const getBookingsbyHotelId = async ( req: Request, res: Response, next: NextFunction ) => {
  try {
    const { id } = req.params;
    
    // Fetch all the bookings for the a specific hotel from the database
    const bookings = await Booking.find({ hotelId: id });

    // Send the bookings data
    res.json({ bookings });
    return;

  } catch (error) {
    next(error);
  }
};


// Get all hotels for a specific user
export const getBookingsbyUserId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Fetch bookings for the user and populate the hotel data completely
    const bookings = await Booking.find({ userId: id }).populate({
      path: "hotelId", 
      model: "Hotel"   
    });

    // If no bookings are found
    if (!bookings || bookings.length === 0) {
      throw new NotFoundError("No bookings found for this user");
    }
    // Send the bookings data
    res.json({ bookings });
    return;

  } catch (error) {
    next(error);
  }
};

// Cancel a booking
export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
      const { bookingId, userId } = req.body;

      const booking = await Booking.findOne({ _id: bookingId, userId });

      if (!booking) {
          throw new NotFoundError("Booking not found or does not belong to the user");
      }

      if (booking.status === "Canceled") {
          throw new NotFoundError("Booking is already canceled");
      }

      booking.status = "Canceled";
      await booking.save();

      res.status(200).json({ message: "Booking successfully canceled" });
  } catch (error) {
      next(error);
  }
};


// Get all bookings
export const getAllBookings = async ( req: Request, res: Response, next: NextFunction ) => {
  try {
    const bookings = await Booking.find();

    res.status(200).json(bookings);
    return;
  } catch (error) {
    next(error);
  }
};
