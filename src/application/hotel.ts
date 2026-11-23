import { NextFunction, Request, Response } from "express";
import Hotel, {
  buildDefaultRoomTypes,
  inferSmartTags,
  normalizeHotelDoc,
} from "./../infrastructure/schemas/Hotel";
import Booking from "../infrastructure/schemas/Booking";
import Contact from "../infrastructure/schemas/Contact";
import NotFoundError from "../domain/errors/not-found-error";
import ValidationError from "../domain/errors/validation-error";
import { CreateHotelDTO, UpdateHotelDTO } from "../domain/dtos/hotel";
import { removeHotelVector, upsertHotelVector } from "./embedding";

export const getAllHotels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotels = await Hotel.find().sort({ createdAt: -1 });
    res.status(200).json(hotels.map(normalizeHotelDoc));
  } catch (error) {
    next(error);
  }
};

export const getHotelLocations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotels = await Hotel.find({}, { location: 1 });
    const countries = new Set<string>();
    hotels.forEach((h) => {
      if (!h.location) return;
      const parts = h.location.split(",").map((p) => p.trim());
      const countryOrCity = parts[parts.length - 1] || h.location.trim();
      if (countryOrCity) countries.add(countryOrCity);
    });
    res.status(200).json({ locations: ["ALL", ...Array.from(countries)] });
  } catch (error) {
    next(error);
  }
};

export const getHotelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      throw new NotFoundError("Hotel not found");
    }
    res.status(200).json(normalizeHotelDoc(hotel));
  } catch (error) {
    next(error);
  }
};

// Privacy-safe public endpoint returning ONLY date & room-type availability (zero guest PII)
export const getHotelAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    const hotelDoc = await Hotel.findById(hotelId);
    if (!hotelDoc) {
      throw new NotFoundError("Hotel not found");
    }
    const hotel = normalizeHotelDoc(hotelDoc);
    const roomTypes = hotel.roomTypes || buildDefaultRoomTypes(hotel.price);

    const activeBookings = await Booking.find(
      {
        hotelId,
        status: { $ne: "Canceled" },
        departureDate: { $gte: new Date(Date.now() - 86_400_000) },
      },
      { arrivalDate: 1, departureDate: 1, roomType: 1 }
    );

    // Count booked rooms per YYYY-MM-DD per roomType
    const dateRoomCounts: Record<string, Record<string, number>> = {};

    for (const b of activeBookings) {
      const start = new Date(b.arrivalDate);
      const end = new Date(b.departureDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const cursor = new Date(start);
      // Hotel night occupancy runs from arrivalDate up to (departureDate - 1 night)
      while (cursor < end) {
        const key = cursor.toISOString().slice(0, 10);
        if (!dateRoomCounts[key]) dateRoomCounts[key] = {};
        const rType = (b.roomType || "single").toLowerCase();
        dateRoomCounts[key][rType] = (dateRoomCounts[key][rType] || 0) + 1;
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const unavailableDatesByRoomType: Record<string, string[]> = {};
    for (const rt of roomTypes) {
      unavailableDatesByRoomType[rt.type] = [];
    }

    const fullyBookedDates: string[] = [];

    for (const [dateKey, counts] of Object.entries(dateRoomCounts)) {
      let allTypesFull = true;
      for (const rt of roomTypes) {
        const bookedCount = counts[rt.type] || 0;
        if (bookedCount >= (rt.totalRooms || 1)) {
          unavailableDatesByRoomType[rt.type].push(dateKey);
        } else {
          allTypesFull = false;
        }
      }
      if (allTypesFull) {
        fullyBookedDates.push(dateKey);
      }
    }

    res.status(200).json({
      hotelId,
      roomTypes,
      unavailableDatesByRoomType,
      fullyBookedDates,
    });
  } catch (error) {
    next(error);
  }
};

export const createHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = CreateHotelDTO.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }

    const data = parsed.data;
    const roomTypes =
      data.roomTypes && data.roomTypes.length > 0
        ? data.roomTypes
        : buildDefaultRoomTypes(data.price);
    const images =
      data.images && data.images.length > 0
        ? Array.from(new Set([data.image, ...data.images]))
        : [data.image];
    const tags = inferSmartTags({
      description: data.description,
      price: data.price,
      amenities: data.amenities,
      tags: data.tags,
    });

    const created = await Hotel.create({
      name: data.name,
      location: data.location,
      image: data.image,
      images,
      price: data.price,
      description: data.description,
      amenities:
        data.amenities && data.amenities.length > 0
          ? data.amenities
          : undefined,
      roomTypes,
      policies: data.policies,
      tags,
    });

    // Non-blocking vector sync
    upsertHotelVector(created).catch((err) =>
      console.warn("Vector sync warning on createHotel:", err?.message ?? err)
    );

    res.status(201).json(normalizeHotelDoc(created));
  } catch (error) {
    next(error);
  }
};

export const deleteHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    const deleted = await Hotel.findByIdAndDelete(hotelId);
    if (!deleted) {
      throw new NotFoundError("Hotel not found");
    }

    removeHotelVector(hotelId).catch((err) =>
      console.warn("Vector cleanup warning on deleteHotel:", err?.message ?? err)
    );

    res.status(200).json({ message: "Hotel deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateHotel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const hotelId = req.params.id;
    const parsed = UpdateHotelDTO.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }

    const existing = await Hotel.findById(hotelId);
    if (!existing) {
      throw new NotFoundError("Hotel not found");
    }

    const updatePayload: any = { ...parsed.data };
    if (updatePayload.image && updatePayload.images) {
      updatePayload.images = Array.from(
        new Set([updatePayload.image, ...updatePayload.images])
      );
    }

    const updated = await Hotel.findByIdAndUpdate(hotelId, updatePayload, {
      new: true,
    });

    if (updated) {
      upsertHotelVector(updated).catch((err) =>
        console.warn("Vector sync warning on updateHotel:", err?.message ?? err)
      );
    }

    res.status(200).json(normalizeHotelDoc(updated));
  } catch (error) {
    next(error);
  }
};

export const getAdminDashboardStats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [hotelsCount, bookings, unreadContactsCount] = await Promise.all([
      Hotel.countDocuments(),
      Booking.find().populate({ path: "hotelId", model: "Hotel" }),
      Contact.countDocuments({ status: { $ne: "resolved" } }),
    ]);

    const now = new Date();
    let totalRevenue = 0;
    let ongoingCount = 0;
    let completedCount = 0;
    let canceledCount = 0;
    let whatsappPendingCount = 0;

    for (const b of bookings) {
      const amount = Number((b as any).payment) || 0;
      if (b.status === "Canceled") {
        canceledCount += 1;
      } else {
        totalRevenue += amount;
        if (
          b.status === "Completed" ||
          (b.departureDate && new Date(b.departureDate) < now)
        ) {
          completedCount += 1;
        } else {
          ongoingCount += 1;
        }
        if ((b as any).paymentStatus === "Pending_WhatsApp") {
          whatsappPendingCount += 1;
        }
      }
    }

    res.status(200).json({
      hotelsCount,
      totalBookings: bookings.length,
      totalRevenue,
      ongoingCount,
      completedCount,
      canceledCount,
      whatsappPendingCount,
      unreadContactsCount,
    });
  } catch (error) {
    next(error);
  }
};
