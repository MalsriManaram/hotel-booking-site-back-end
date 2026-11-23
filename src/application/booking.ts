import { Request, Response, NextFunction } from "express";
import Booking from "../infrastructure/schemas/Booking";
import Hotel, {
  buildDefaultRoomTypes,
  normalizeHotelDoc,
} from "../infrastructure/schemas/Hotel";
import { CreateBookingDTO } from "../domain/dtos/booking";
import ValidationError from "../domain/errors/validation-error";
import NotFoundError from "../domain/errors/not-found-error";
import ForbiddenError from "../domain/errors/forbidden-error";
import { checkIsAdminRequest } from "../api/middlewares/authorization-middleware";
import { escapeHtml, getMailTransporter } from "./contact";

const WHATSAPP_STORE_NUMBER =
  (process.env.WHATSAPP_STORE_NUMBER || "94771231234").replace(/[^0-9]/g, "");

export function evaluatePromoCode(
  codeRaw: string,
  subtotal: number,
  roomType: string,
  nights: number
): { valid: boolean; code: string; discountPercent: number; discountAmount: number; reason?: string } {
  const code = (codeRaw || "").trim().toUpperCase();
  if (!code) {
    return { valid: false, code: "", discountPercent: 0, discountAmount: 0 };
  }

  if (code === "STAYLUX10") {
    const discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
    return { valid: true, code, discountPercent: 10, discountAmount };
  }

  if (code === "WELCOME15") {
    const r = roomType.toLowerCase();
    if (r !== "deluxe" && r !== "suite") {
      return {
        valid: false,
        code,
        discountPercent: 0,
        discountAmount: 0,
        reason: "WELCOME15 applies to Deluxe and Suite room types only.",
      };
    }
    const discountAmount = Math.round(subtotal * 0.15 * 100) / 100;
    return { valid: true, code, discountPercent: 15, discountAmount };
  }

  if (code === "LUXURY20") {
    if (nights < 4) {
      return {
        valid: false,
        code,
        discountPercent: 0,
        discountAmount: 0,
        reason: "LUXURY20 requires a stay of at least 4 nights.",
      };
    }
    const discountAmount = Math.round(subtotal * 0.2 * 100) / 100;
    return { valid: true, code, discountPercent: 20, discountAmount };
  }

  return {
    valid: false,
    code,
    discountPercent: 0,
    discountAmount: 0,
    reason: "Invalid or expired promo code.",
  };
}

export const validatePromoEndpoint = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { promoCode, subtotal = 0, roomType = "single", nights = 1 } = req.body;
    const evaluation = evaluatePromoCode(
      String(promoCode || ""),
      Number(subtotal) || 0,
      String(roomType || "single"),
      Number(nights) || 1
    );
    if (!evaluation.valid) {
      res.status(400).json({
        valid: false,
        message: evaluation.reason || "Invalid promo code",
      });
      return;
    }
    res.status(200).json(evaluation);
  } catch (error) {
    next(error);
  }
};

function generateBookingRef(): string {
  const now = new Date();
  const ym = `${String(now.getFullYear()).slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SLX-${ym}-${rand}`;
}

function buildWhatsAppOrderLink(params: {
  bookingRef: string;
  hotelName: string;
  hotelLocation: string;
  roomName: string;
  firstName: string;
  lastName: string;
  phone: string;
  arrivalDate: Date;
  departureDate: Date;
  nights: number;
  adults: number;
  children: number;
  totalPrice: number;
  discountAmount: number;
  promoCode?: string;
  specialRequests?: string;
}): string {
  const lines = [
    `🏨 *StayLux WhatsApp Store Reservation*`,
    `🔖 *Booking Ref:* ${params.bookingRef}`,
    `📍 *Property:* ${params.hotelName} (${params.hotelLocation})`,
    `🛏️ *Room:* ${params.roomName}`,
    `📅 *Check-in:* ${params.arrivalDate.toISOString().slice(0, 10)}`,
    `📅 *Check-out:* ${params.departureDate.toISOString().slice(0, 10)} (${params.nights} night${params.nights > 1 ? "s" : ""})`,
    `👥 *Guests:* ${params.adults} Adult(s), ${params.children} Child(ren)`,
    `👤 *Guest:* ${params.firstName} ${params.lastName} (${params.phone})`,
    params.discountAmount > 0
      ? `🎁 *Promo (${params.promoCode}):* -$${params.discountAmount}`
      : "",
    `💳 *Total Amount:* $${params.totalPrice} USD`,
    params.specialRequests
      ? `📝 *Special Requests:* ${params.specialRequests}`
      : "",
    ``,
    `Hello StayLux Team! Please confirm my booking and share payment/check-in details.`,
  ].filter(Boolean);

  return `https://wa.me/${WHATSAPP_STORE_NUMBER}?text=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

async function sendBookingEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  bookingRef: string;
  hotelName: string;
  roomName: string;
  arrivalDate: Date;
  departureDate: Date;
  totalPrice: string | number;
  whatsappUrl?: string;
  statusLabel: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) return;

  const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;background:#f6f8fa;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
      <div style="background:#000000;color:#ffffff;padding:20px 28px;">
        <h2 style="margin:0;color:#f7b436;">StayLux</h2>
        <p style="margin:4px 0 0;font-size:14px;color:#d1d5db;">${escapeHtml(opts.heading)}</p>
      </div>
      <div style="padding:24px 28px;color:#111827;line-height:1.6;">
        <p style="margin:0 0 12px;"><strong>Reference:</strong> ${escapeHtml(opts.bookingRef)}</p>
        <p style="margin:0 0 8px;"><strong>Hotel:</strong> ${escapeHtml(opts.hotelName)}</p>
        <p style="margin:0 0 8px;"><strong>Room Type:</strong> ${escapeHtml(opts.roomName)}</p>
        <p style="margin:0 0 8px;"><strong>Check-in:</strong> ${opts.arrivalDate.toDateString()}</p>
        <p style="margin:0 0 8px;"><strong>Check-out:</strong> ${opts.departureDate.toDateString()}</p>
        <p style="margin:0 0 8px;"><strong>Total:</strong> $${escapeHtml(String(opts.totalPrice))} USD</p>
        <p style="margin:0 0 18px;"><strong>Status:</strong> ${escapeHtml(opts.statusLabel)}</p>
        ${
          opts.whatsappUrl
            ? `<a href="${opts.whatsappUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Confirm & Chat on WhatsApp Store</a>`
            : ""
        }
      </div>
      <div style="background:#f9fafb;padding:12px 28px;font-size:12px;color:#6b7280;text-align:center;">
        © ${new Date().getFullYear()} StayLux Luxury Hospitality
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: `"StayLux Reservations" <${fromAddr}>`,
    to: opts.to,
    subject: opts.subject,
    html,
  });
}

async function syncCompletedStatuses(filter: Record<string, any>) {
  const now = new Date();
  await Booking.updateMany(
    {
      ...filter,
      status: "Ongoing",
      departureDate: { $lt: now },
    },
    { $set: { status: "Completed" } }
  );
}

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = CreateBookingDTO.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
      );
    }

    const data = parsed.data;
    const userId = (req as any)?.auth?.userId;

    const hotelDoc = await Hotel.findById(data.hotelId);
    if (!hotelDoc) {
      throw new NotFoundError("Selected hotel does not exist");
    }
    const hotel = normalizeHotelDoc(hotelDoc);

    const arrival = new Date(data.arrivalDate);
    const departure = new Date(data.departureDate);
    if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
      throw new ValidationError("Invalid arrival or departure date");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (arrival < new Date(todayStart.getTime() - 43_200_000)) {
      throw new ValidationError("Arrival date cannot be in the past");
    }
    if (departure <= arrival) {
      throw new ValidationError("Departure date must be after arrival date");
    }

    const nights = Math.max(
      1,
      Math.ceil((departure.getTime() - arrival.getTime()) / 86_400_000)
    );

    const roomTypes = hotel.roomTypes || buildDefaultRoomTypes(hotel.price);
    const normalizedRoomKey = data.roomType.toLowerCase();
    const matchedRoom =
      roomTypes.find((r: any) => r.type === normalizedRoomKey) || roomTypes[0];

    // Server-side room capacity & date-overlap inventory check
    const overlappingBookings = await Booking.find({
      hotelId: data.hotelId,
      roomType: normalizedRoomKey,
      status: { $ne: "Canceled" },
      arrivalDate: { $lt: departure },
      departureDate: { $gt: arrival },
    });

    const cursor = new Date(arrival);
    cursor.setHours(0, 0, 0, 0);
    const endCheck = new Date(departure);
    endCheck.setHours(0, 0, 0, 0);

    while (cursor < endCheck) {
      const dayTime = cursor.getTime();
      let countOnNight = 0;
      for (const ob of overlappingBookings) {
        const s = new Date(ob.arrivalDate);
        const e = new Date(ob.departureDate);
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        if (dayTime >= s.getTime() && dayTime < e.getTime()) {
          countOnNight += 1;
        }
      }
      if (countOnNight >= (matchedRoom.totalRooms || 1)) {
        throw new ValidationError(
          `No ${matchedRoom.name} availability left on ${cursor
            .toISOString()
            .slice(0, 10)}. Please try another room type or dates.`
        );
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const subtotal = nights * Number(matchedRoom.price || hotel.price);
    const promoEval = evaluatePromoCode(
      data.promoCode || "",
      subtotal,
      normalizedRoomKey,
      nights
    );
    if (data.promoCode && !promoEval.valid) {
      throw new ValidationError(promoEval.reason || "Invalid promo code");
    }

    const finalPrice = Math.max(1, Math.round((subtotal - promoEval.discountAmount) * 100) / 100);
    const bookingRef = generateBookingRef();

    const paymentMethod = data.paymentMethod || "whatsapp";
    const paymentStatus =
      paymentMethod === "pay_at_hotel"
        ? "Pay_At_Hotel"
        : "Pending_WhatsApp";

    const whatsappOrderUrl = buildWhatsAppOrderLink({
      bookingRef,
      hotelName: hotel.name,
      hotelLocation: hotel.location,
      roomName: matchedRoom.name,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      arrivalDate: arrival,
      departureDate: departure,
      nights,
      adults: data.adults,
      children: data.children,
      totalPrice: finalPrice,
      discountAmount: promoEval.discountAmount,
      promoCode: promoEval.valid ? promoEval.code : undefined,
      specialRequests: data.specialRequests,
    });

    const created = await Booking.create({
      bookingRef,
      hotelId: data.hotelId,
      userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      arrivalDate: arrival,
      departureDate: departure,
      roomType: normalizedRoomKey,
      adults: data.adults,
      children: data.children,
      specialRequests: data.specialRequests || "",
      promoCode: promoEval.valid ? promoEval.code : "",
      discountAmount: promoEval.discountAmount,
      payment: String(finalPrice),
      paymentMethod,
      paymentStatus,
      whatsappOrderUrl,
      status: "Ongoing",
    });

    // Non-blocking confirmation email
    sendBookingEmail({
      to: data.email,
      subject: `StayLux Reservation Confirmed (${bookingRef}) — ${hotel.name}`,
      heading: "Reservation Confirmation",
      bookingRef,
      hotelName: hotel.name,
      roomName: matchedRoom.name,
      arrivalDate: arrival,
      departureDate: departure,
      totalPrice: finalPrice,
      whatsappUrl: whatsappOrderUrl,
      statusLabel:
        paymentMethod === "whatsapp"
          ? "Reserved — Ready for WhatsApp Store Confirmation"
          : "Reserved — Pay at Property",
    }).catch((err) =>
      console.warn("Booking confirmation email skipped:", err?.message ?? err)
    );

    res.status(201).json({
      message: "Booking created successfully",
      booking: created,
      whatsappOrderUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingsbyHotelId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await syncCompletedStatuses({ hotelId: id });
    const bookings = await Booking.find({ hotelId: id }).sort({ createdAt: -1 });
    res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const getBookingsbyUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const requesterId = (req as any)?.auth?.userId;
    const adminAllowed = await checkIsAdminRequest(req);

    if (requesterId !== id && !adminAllowed) {
      throw new ForbiddenError("You can only view your own bookings");
    }

    await syncCompletedStatuses({ userId: id });

    const bookings = await Booking.find({ userId: id })
      .populate({
        path: "hotelId",
        model: "Hotel",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings: bookings || [] });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.body;
    const requesterId = (req as any)?.auth?.userId;
    const adminAllowed = await checkIsAdminRequest(req);

    const booking = await Booking.findById(bookingId).populate({
      path: "hotelId",
      model: "Hotel",
    });

    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.userId !== requesterId && !adminAllowed) {
      throw new ForbiddenError("You are not authorized to cancel this booking");
    }

    if (booking.status === "Canceled") {
      throw new ValidationError("Booking is already canceled");
    }

    booking.status = "Canceled";
    await booking.save();

    const hotelObj: any = booking.hotelId;
    sendBookingEmail({
      to: booking.email,
      subject: `StayLux Booking Canceled (${booking.bookingRef || booking._id})`,
      heading: "Reservation Canceled",
      bookingRef: booking.bookingRef || String(booking._id),
      hotelName: hotelObj?.name || "StayLux Property",
      roomName: booking.roomType,
      arrivalDate: new Date(booking.arrivalDate),
      departureDate: new Date(booking.departureDate),
      totalPrice: booking.payment,
      statusLabel: "Canceled",
    }).catch((err) =>
      console.warn("Cancellation email skipped:", err?.message ?? err)
    );

    res.status(200).json({ message: "Booking successfully canceled", booking });
  } catch (error) {
    next(error);
  }
};

export const getAllBookings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await syncCompletedStatuses({});
    const bookings = await Booking.find()
      .populate({
        path: "hotelId",
        model: "Hotel",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatusAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking not found");
    }

    if (status && ["Ongoing", "Completed", "Canceled"].includes(status)) {
      booking.status = status;
    }
    if (
      paymentStatus &&
      ["Pending_WhatsApp", "Pay_At_Hotel", "Paid", "Refunded"].includes(
        paymentStatus
      )
    ) {
      (booking as any).paymentStatus = paymentStatus;
    }

    await booking.save();
    res.status(200).json({ message: "Booking updated", booking });
  } catch (error) {
    next(error);
  }
};
