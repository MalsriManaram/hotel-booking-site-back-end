import { Request, Response, NextFunction } from "express";
import Wishlist from "../infrastructure/schemas/Wishlist";
import Hotel, { normalizeHotelDoc } from "../infrastructure/schemas/Hotel";
import NotFoundError from "../domain/errors/not-found-error";

export const getUserWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any)?.auth?.userId;
    const entries = await Wishlist.find({ userId })
      .populate({ path: "hotelId", model: "Hotel" })
      .sort({ createdAt: -1 });

    const hotels = entries
      .map((entry: any) => (entry.hotelId ? normalizeHotelDoc(entry.hotelId) : null))
      .filter(Boolean);

    const hotelIds = hotels.map((h: any) => String(h._id));
    res.status(200).json({ hotels, hotelIds });
  } catch (error) {
    next(error);
  }
};

export const toggleWishlist = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any)?.auth?.userId;
    const { hotelId } = req.body;

    const hotelExists = await Hotel.exists({ _id: hotelId });
    if (!hotelExists) {
      throw new NotFoundError("Hotel not found");
    }

    const existing = await Wishlist.findOne({ userId, hotelId });
    if (existing) {
      await Wishlist.findByIdAndDelete(existing._id);
      res.status(200).json({ saved: false, hotelId });
      return;
    }

    await Wishlist.create({ userId, hotelId });
    res.status(201).json({ saved: true, hotelId });
  } catch (error) {
    next(error);
  }
};
