import { Request, Response, NextFunction } from "express";
import Booking from "../infrastructure/schemas/Booking";
import { CreateBookingDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
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
    const user = req.auth;
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
    });

    // Return the response
    res.status(201).send();
  } catch (error) {
    next(error);
  }
};


// Get all bookings for a one hotel
export const getAllBookingsForHotel = async ( req: Request, res: Response, next: NextFunction ) => {
  try {
    const hotelId = req.params.hotelId;
    const bookings = await Booking.find({ hotelId: hotelId });
    const bookingsWithUser = await Promise.all(bookings.map(async (el) => {
      const user = await clerkClient.users.getUser(el.userId);
      return { _id: el._id, hotelId: el.hotelId, email: el.email, phone: el.phone, arrivalDate: el.arrivalDate, departureDate: el.departureDate, roomType: el.roomType, adults: el.adults, children: el.children, specialRequests: el.specialRequests, payment: el.payment, user: { id: user.id, firstName: user.firstName, lastName: user.lastName } }
    }))

    res.status(200).json(bookingsWithUser);
    return;
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


// // Delete a booking
// export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const bookingId = req.params.id;

//     // Delete the booking
//     await Booking.findByIdAndDelete(bookingId);

//     // Return the response
//     res.status(200).send();
//   } catch (error) {
//     next(error);
//   }
// };
