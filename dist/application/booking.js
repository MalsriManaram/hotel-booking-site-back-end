"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatusAdmin = exports.getAllBookings = exports.cancelBooking = exports.getBookingsbyUserId = exports.getBookingsbyHotelId = exports.createBooking = exports.validatePromoEndpoint = void 0;
exports.evaluatePromoCode = evaluatePromoCode;
const Booking_1 = __importDefault(require("../infrastructure/schemas/Booking"));
const Hotel_1 = __importStar(require("../infrastructure/schemas/Hotel"));
const booking_1 = require("../domain/dtos/booking");
const validation_error_1 = __importDefault(require("../domain/errors/validation-error"));
const not_found_error_1 = __importDefault(require("../domain/errors/not-found-error"));
const forbidden_error_1 = __importDefault(require("../domain/errors/forbidden-error"));
const authorization_middleware_1 = require("../api/middlewares/authorization-middleware");
const contact_1 = require("./contact");
const WHATSAPP_STORE_NUMBER = (process.env.WHATSAPP_STORE_NUMBER || "94771231234").replace(/[^0-9]/g, "");
function evaluatePromoCode(codeRaw, subtotal, roomType, nights) {
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
const validatePromoEndpoint = async (req, res, next) => {
    try {
        const { promoCode, subtotal = 0, roomType = "single", nights = 1 } = req.body;
        const evaluation = evaluatePromoCode(String(promoCode || ""), Number(subtotal) || 0, String(roomType || "single"), Number(nights) || 1);
        if (!evaluation.valid) {
            res.status(400).json({
                valid: false,
                message: evaluation.reason || "Invalid promo code",
            });
            return;
        }
        res.status(200).json(evaluation);
    }
    catch (error) {
        next(error);
    }
};
exports.validatePromoEndpoint = validatePromoEndpoint;
function generateBookingRef() {
    const now = new Date();
    const ym = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `SLX-${ym}-${rand}`;
}
function buildWhatsAppOrderLink(params) {
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
    return `https://wa.me/${WHATSAPP_STORE_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}
async function sendBookingEmail(opts) {
    const transporter = (0, contact_1.getMailTransporter)();
    if (!transporter)
        return;
    const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;background:#f6f8fa;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
      <div style="background:#000000;color:#ffffff;padding:20px 28px;">
        <h2 style="margin:0;color:#f7b436;">StayLux</h2>
        <p style="margin:4px 0 0;font-size:14px;color:#d1d5db;">${(0, contact_1.escapeHtml)(opts.heading)}</p>
      </div>
      <div style="padding:24px 28px;color:#111827;line-height:1.6;">
        <p style="margin:0 0 12px;"><strong>Reference:</strong> ${(0, contact_1.escapeHtml)(opts.bookingRef)}</p>
        <p style="margin:0 0 8px;"><strong>Hotel:</strong> ${(0, contact_1.escapeHtml)(opts.hotelName)}</p>
        <p style="margin:0 0 8px;"><strong>Room Type:</strong> ${(0, contact_1.escapeHtml)(opts.roomName)}</p>
        <p style="margin:0 0 8px;"><strong>Check-in:</strong> ${opts.arrivalDate.toDateString()}</p>
        <p style="margin:0 0 8px;"><strong>Check-out:</strong> ${opts.departureDate.toDateString()}</p>
        <p style="margin:0 0 8px;"><strong>Total:</strong> $${(0, contact_1.escapeHtml)(String(opts.totalPrice))} USD</p>
        <p style="margin:0 0 18px;"><strong>Status:</strong> ${(0, contact_1.escapeHtml)(opts.statusLabel)}</p>
        ${opts.whatsappUrl
        ? `<a href="${opts.whatsappUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Confirm & Chat on WhatsApp Store</a>`
        : ""}
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
async function syncCompletedStatuses(filter) {
    const now = new Date();
    await Booking_1.default.updateMany({
        ...filter,
        status: "Ongoing",
        departureDate: { $lt: now },
    }, { $set: { status: "Completed" } });
}
const createBooking = async (req, res, next) => {
    try {
        const parsed = booking_1.CreateBookingDTO.safeParse(req.body);
        if (!parsed.success) {
            throw new validation_error_1.default(parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "));
        }
        const data = parsed.data;
        const userId = req?.auth?.userId;
        const hotelDoc = await Hotel_1.default.findById(data.hotelId);
        if (!hotelDoc) {
            throw new not_found_error_1.default("Selected hotel does not exist");
        }
        const hotel = (0, Hotel_1.normalizeHotelDoc)(hotelDoc);
        const arrival = new Date(data.arrivalDate);
        const departure = new Date(data.departureDate);
        if (isNaN(arrival.getTime()) || isNaN(departure.getTime())) {
            throw new validation_error_1.default("Invalid arrival or departure date");
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (arrival < new Date(todayStart.getTime() - 43200000)) {
            throw new validation_error_1.default("Arrival date cannot be in the past");
        }
        if (departure <= arrival) {
            throw new validation_error_1.default("Departure date must be after arrival date");
        }
        const nights = Math.max(1, Math.ceil((departure.getTime() - arrival.getTime()) / 86400000));
        const roomTypes = hotel.roomTypes || (0, Hotel_1.buildDefaultRoomTypes)(hotel.price);
        const normalizedRoomKey = data.roomType.toLowerCase();
        const matchedRoom = roomTypes.find((r) => r.type === normalizedRoomKey) || roomTypes[0];
        // Server-side room capacity & date-overlap inventory check
        const overlappingBookings = await Booking_1.default.find({
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
                throw new validation_error_1.default(`No ${matchedRoom.name} availability left on ${cursor
                    .toISOString()
                    .slice(0, 10)}. Please try another room type or dates.`);
            }
            cursor.setDate(cursor.getDate() + 1);
        }
        const subtotal = nights * Number(matchedRoom.price || hotel.price);
        const promoEval = evaluatePromoCode(data.promoCode || "", subtotal, normalizedRoomKey, nights);
        if (data.promoCode && !promoEval.valid) {
            throw new validation_error_1.default(promoEval.reason || "Invalid promo code");
        }
        const finalPrice = Math.max(1, Math.round((subtotal - promoEval.discountAmount) * 100) / 100);
        const bookingRef = generateBookingRef();
        const paymentMethod = data.paymentMethod || "whatsapp";
        const paymentStatus = paymentMethod === "pay_at_hotel"
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
        const created = await Booking_1.default.create({
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
            statusLabel: paymentMethod === "whatsapp"
                ? "Reserved — Ready for WhatsApp Store Confirmation"
                : "Reserved — Pay at Property",
        }).catch((err) => console.warn("Booking confirmation email skipped:", err?.message ?? err));
        res.status(201).json({
            message: "Booking created successfully",
            booking: created,
            whatsappOrderUrl,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createBooking = createBooking;
const getBookingsbyHotelId = async (req, res, next) => {
    try {
        const { id } = req.params;
        await syncCompletedStatuses({ hotelId: id });
        const bookings = await Booking_1.default.find({ hotelId: id }).sort({ createdAt: -1 });
        res.status(200).json({ bookings });
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingsbyHotelId = getBookingsbyHotelId;
const getBookingsbyUserId = async (req, res, next) => {
    try {
        const { id } = req.params;
        const requesterId = req?.auth?.userId;
        const adminAllowed = await (0, authorization_middleware_1.checkIsAdminRequest)(req);
        if (requesterId !== id && !adminAllowed) {
            throw new forbidden_error_1.default("You can only view your own bookings");
        }
        await syncCompletedStatuses({ userId: id });
        const bookings = await Booking_1.default.find({ userId: id })
            .populate({
            path: "hotelId",
            model: "Hotel",
        })
            .sort({ createdAt: -1 });
        res.status(200).json({ bookings: bookings || [] });
    }
    catch (error) {
        next(error);
    }
};
exports.getBookingsbyUserId = getBookingsbyUserId;
const cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        const requesterId = req?.auth?.userId;
        const adminAllowed = await (0, authorization_middleware_1.checkIsAdminRequest)(req);
        const booking = await Booking_1.default.findById(bookingId).populate({
            path: "hotelId",
            model: "Hotel",
        });
        if (!booking) {
            throw new not_found_error_1.default("Booking not found");
        }
        if (booking.userId !== requesterId && !adminAllowed) {
            throw new forbidden_error_1.default("You are not authorized to cancel this booking");
        }
        if (booking.status === "Canceled") {
            throw new validation_error_1.default("Booking is already canceled");
        }
        booking.status = "Canceled";
        await booking.save();
        const hotelObj = booking.hotelId;
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
        }).catch((err) => console.warn("Cancellation email skipped:", err?.message ?? err));
        res.status(200).json({ message: "Booking successfully canceled", booking });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelBooking = cancelBooking;
const getAllBookings = async (req, res, next) => {
    try {
        await syncCompletedStatuses({});
        const bookings = await Booking_1.default.find()
            .populate({
            path: "hotelId",
            model: "Hotel",
        })
            .sort({ createdAt: -1 });
        res.status(200).json({ bookings });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllBookings = getAllBookings;
const updateBookingStatusAdmin = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, paymentStatus } = req.body;
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            throw new not_found_error_1.default("Booking not found");
        }
        if (status && ["Ongoing", "Completed", "Canceled"].includes(status)) {
            booking.status = status;
        }
        if (paymentStatus &&
            ["Pending_WhatsApp", "Pay_At_Hotel", "Paid", "Refunded"].includes(paymentStatus)) {
            booking.paymentStatus = paymentStatus;
        }
        await booking.save();
        res.status(200).json({ message: "Booking updated", booking });
    }
    catch (error) {
        next(error);
    }
};
exports.updateBookingStatusAdmin = updateBookingStatusAdmin;
