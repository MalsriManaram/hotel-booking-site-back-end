import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["single", "double", "deluxe", "suite"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    capacityAdults: {
      type: Number,
      default: 2,
      min: 1,
    },
    capacityChildren: {
      type: Number,
      default: 2,
      min: 0,
    },
    totalRooms: {
      type: Number,
      default: 4,
      min: 1,
    },
  },
  { _id: false }
);

const hotelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    amenities: {
      type: [String],
      default: [
        "Free Wi-Fi",
        "Restaurant",
        "Flat-screen TV",
        "Coffee maker",
        "Air Conditioning",
        "24/7 Front Desk",
      ],
    },
    roomTypes: {
      type: [roomTypeSchema],
      default: [],
    },
    policies: {
      checkIn: { type: String, default: "14:00" },
      checkOut: { type: String, default: "11:00" },
      freeCancellationHours: { type: Number, default: 48 },
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export function buildDefaultRoomTypes(basePrice: number) {
  const base = Math.max(1, Math.round(basePrice || 100));
  return [
    {
      type: "single" as const,
      name: "Classic Single Room",
      price: base,
      capacityAdults: 2,
      capacityChildren: 1,
      totalRooms: 5,
    },
    {
      type: "double" as const,
      name: "Superior Double Room",
      price: Math.round(base * 1.3),
      capacityAdults: 3,
      capacityChildren: 2,
      totalRooms: 5,
    },
    {
      type: "deluxe" as const,
      name: "Deluxe Panoramic Room",
      price: Math.round(base * 1.65),
      capacityAdults: 4,
      capacityChildren: 2,
      totalRooms: 3,
    },
    {
      type: "suite" as const,
      name: "Executive Luxury Suite",
      price: Math.round(base * 2.15),
      capacityAdults: 5,
      capacityChildren: 3,
      totalRooms: 2,
    },
  ];
}

export function inferSmartTags(hotel: {
  description?: string;
  price?: number;
  rating?: number;
  amenities?: string[];
  tags?: string[];
}): string[] {
  if (hotel.tags && hotel.tags.length > 0) return hotel.tags;
  const text = `${hotel.description || ""} ${(hotel.amenities || []).join(" ")}`.toLowerCase();
  const tags: string[] = [];

  if (/romantic|couple|dreamy|honeymoon|sunset|charm/.test(text)) {
    tags.push("Romantic Escape");
  }
  if (/harbour|beach|ocean|sea|waterfront|island|coast/.test(text)) {
    tags.push("Waterfront View");
  }
  if (/heart of|central|city|metro|urban|downtown|shopping/.test(text)) {
    tags.push("City Center");
  }
  if (/serene|tranquil|garden|retreat|spa|sanctuary|peace/.test(text)) {
    tags.push("Wellness & Retreat");
  }
  if ((hotel.price || 0) >= 250 || /palace|michelin|opulent|luxury/.test(text)) {
    tags.push("Ultra Luxury");
  } else if ((hotel.price || 0) > 0 && (hotel.price || 0) <= 160) {
    tags.push("Great Value");
  }
  if ((hotel.rating || 0) >= 4.8) {
    tags.push("Top Rated");
  }

  return tags.slice(0, 3);
}

export function normalizeHotelDoc(doc: any) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const basePrice = Number(obj.price) || 100;

  if (!obj.roomTypes || obj.roomTypes.length === 0) {
    obj.roomTypes = buildDefaultRoomTypes(basePrice);
  }
  if (!obj.amenities || obj.amenities.length === 0) {
    obj.amenities = [
      "Free Wi-Fi",
      "Restaurant",
      "Flat-screen TV",
      "Coffee maker",
      "Air Conditioning",
      "24/7 Front Desk",
    ];
  }
  if (!obj.images || obj.images.length === 0) {
    obj.images = obj.image ? [obj.image] : [];
  } else if (obj.image && !obj.images.includes(obj.image)) {
    obj.images = [obj.image, ...obj.images];
  }
  if (!obj.policies) {
    obj.policies = {
      checkIn: "14:00",
      checkOut: "11:00",
      freeCancellationHours: 48,
    };
  }
  obj.tags = inferSmartTags(obj);
  return obj;
}

export default mongoose.model("Hotel", hotelSchema);
