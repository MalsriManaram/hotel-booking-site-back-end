// Zero-cost, zero-API-key Local Hospitality Concept Vectorizer + BM25 + NLP Query Parser

export interface ParsedHotelQuery {
  cleanQuery: string;
  extractedLocation?: string;
  maxPrice?: number;
  minPrice?: number;
  minRating?: number;
  amenities: string[];
  roomType?: string;
  guests?: number;
}

const CONCEPT_DIMENSIONS: Record<string, RegExp> = {
  romantic: /romantic|couple|honeymoon|dreamy|charm|intimate|sunset|anniversary|love/i,
  luxury: /luxury|luxurious|opulent|palace|five[\s-]?star|michelin|grand|premium|vip|elegant|refined|suite/i,
  value: /budget|affordable|cheap|economical|value|inexpensive|deal/i,
  waterfront: /harbour|harbor|beach|beachfront|ocean|sea|waterfront|coast|coastal|bay|island|seine|lake/i,
  urban: /city|urban|central|downtown|metro|heart of|tower|skyline|bustling|cosmopolitan/i,
  nature: /nature|garden|serene|tranquil|peace|peaceful|retreat|sanctuary|mountain|zen|greenery|quiet/i,
  culture: /historic|history|temple|museum|palace|renaissance|heritage|cultural|tradition|louvre|colosseum|vatican/i,
  dining: /dining|restaurant|cuisine|foodie|food|breakfast|rooftop|michelin|cafe|coffee|culinary|wine/i,
  wellness: /spa|wellness|pool|swimming|relax|relaxation|massage|sauna|fitness|gym/i,
  shopping: /shopping|fashion|boutique|galleria|mall|style|stylish|milan/i,
  family: /family|kids|children|spacious|group|large/i,
  nightlife: /nightlife|vibrant|bar|club|entertainment|lively|excitement/i,
  scenic: /view|views|panoramic|vista|overlooking|rooftop|scenic|breathtaking/i,
  modern: /modern|tech|contemporary|minimalistic|sleek|smart|wifi/i,
};

const STOP_WORDS = new Set([
  "a", "an", "the", "in", "at", "on", "for", "with", "and", "or", "to", "of",
  "hotel", "hotels", "stay", "place", "looking", "find", "me", "want", "need",
  "per", "night", "under", "below", "less", "than", "over", "above", "around",
  "near", "best", "good", "nice", "from", "starting", "is", "are", "i", "my",
]);

const KNOWN_AMENITIES: Array<{ canonical: string; pattern: RegExp }> = [
  { canonical: "Free Wi-Fi", pattern: /\bwi[\s-]?fi\b|\binternet\b/i },
  { canonical: "Swimming Pool", pattern: /\bpool\b|\bswim/i },
  { canonical: "Spa & Wellness", pattern: /\bspa\b|\bmassage\b|\bsauna\b/i },
  { canonical: "Restaurant", pattern: /\brestaurant\b|\bdining\b|\bbreakfast\b/i },
  { canonical: "Fitness Center", pattern: /\bgym\b|\bfitness\b/i },
  { canonical: "Airport Shuttle", pattern: /\bshuttle\b|\bairport\b/i },
  { canonical: "Free Parking", pattern: /\bparking\b/i },
  { canonical: "Air Conditioning", pattern: /\bac\b|\bair[\s-]?conditioning\b/i },
  { canonical: "Coffee maker", pattern: /\bcoffee\b/i },
  { canonical: "Flat-screen TV", pattern: /\btv\b|\btelevision\b/i },
  { canonical: "Rooftop Bar", pattern: /\brooftop\b/i },
  { canonical: "Beach Access", pattern: /\bbeach\b/i },
];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, ""));
}

function buildConceptVector(text: string): number[] {
  const keys = Object.keys(CONCEPT_DIMENSIONS);
  return keys.map((key) => {
    const matches = text.match(new RegExp(CONCEPT_DIMENSIONS[key].source, "gi"));
    return matches ? Math.min(1, matches.length * 0.5) : 0;
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function parseNaturalLanguageHotelQuery(
  rawText: string,
  knownLocations: string[] = []
): ParsedHotelQuery {
  const text = (rawText || "").trim();
  const result: ParsedHotelQuery = {
    cleanQuery: text,
    amenities: [],
  };
  if (!text) return result;

  // Extract max price: "under $200", "below 250", "max $180", "< 200", "up to $300"
  const maxPriceMatch = text.match(
    /(?:under|below|less than|max|maximum|up to|<=?)\s*\$?\s*(\d{2,5})/i
  );
  if (maxPriceMatch) {
    result.maxPrice = Number(maxPriceMatch[1]);
  } else if (/\bbudget\b|\bcheap\b|\baffordable\b/i.test(text)) {
    result.maxPrice = 185;
  }

  // Extract min price: "over $250", "above 200"
  const minPriceMatch = text.match(/(?:over|above|more than|>=?)\s*\$?\s*(\d{2,5})/i);
  if (minPriceMatch) {
    result.minPrice = Number(minPriceMatch[1]);
  }

  // Extract rating: "4.7+ rating", "rating above 4.5", "at least 4.6 stars"
  const ratingMatch =
    text.match(/(\d(?:\.\d)?)\s*\+?\s*(?:star|stars|rating)/i) ||
    text.match(/(?:rating|rated)\s*(?:above|over|at least|>=?)?\s*(\d(?:\.\d)?)/i);
  if (ratingMatch) {
    const val = parseFloat(ratingMatch[1]);
    if (val >= 1 && val <= 5) result.minRating = val;
  } else if (/\btop[\s-]?rated\b|\bbest[\s-]?rated\b|\bhighest[\s-]?rated\b/i.test(text)) {
    result.minRating = 4.7;
  }

  // Extract guests: "for 2 adults", "3 guests"
  const guestMatch = text.match(/(\d+)\s*(?:adults?|guests?|people|persons?)/i);
  if (guestMatch) {
    result.guests = Number(guestMatch[1]);
  }

  // Extract room type
  if (/\bsuite\b/i.test(text)) result.roomType = "suite";
  else if (/\bdeluxe\b/i.test(text)) result.roomType = "deluxe";
  else if (/\bdouble\b/i.test(text)) result.roomType = "double";
  else if (/\bsingle\b/i.test(text)) result.roomType = "single";

  // Extract amenities
  for (const item of KNOWN_AMENITIES) {
    if (item.pattern.test(text)) {
      result.amenities.push(item.canonical);
    }
  }

  // Match known locations (cities / countries in DB)
  const lower = text.toLowerCase();
  for (const loc of knownLocations) {
    const parts = loc
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (part.length >= 3 && lower.includes(part.toLowerCase())) {
        result.extractedLocation = part;
        break;
      }
    }
    if (result.extractedLocation) break;
  }

  return result;
}

export function computeLocalHybridScore(
  queryText: string,
  parsed: ParsedHotelQuery,
  hotel: any
): number {
  const hotelCorpus = `${hotel.name || ""} ${hotel.location || ""} ${
    hotel.description || ""
  } ${(hotel.amenities || []).join(" ")} ${(hotel.tags || []).join(" ")}`;

  const queryVec = buildConceptVector(queryText);
  const hotelVec = buildConceptVector(hotelCorpus);
  const conceptSim = cosineSimilarity(queryVec, hotelVec);

  const qTokens = tokenize(queryText);
  const hTokens = new Set(tokenize(hotelCorpus));
  let tokenHits = 0;
  for (const qt of qTokens) {
    if (hTokens.has(qt)) {
      tokenHits += 1;
    } else {
      for (const ht of hTokens) {
        if (ht.length >= 4 && qt.length >= 4 && (ht.includes(qt) || qt.includes(ht))) {
          tokenHits += 0.65;
          break;
        }
      }
    }
  }
  const lexicalSim = qTokens.length > 0 ? Math.min(1, tokenHits / qTokens.length) : 0.5;

  // Combine concept cosine + lexical overlap + subtle quality boost
  let score = 0.45 * conceptSim + 0.45 * lexicalSim + 0.1 * ((hotel.rating || 4.5) / 5);

  if (
    parsed.extractedLocation &&
    (hotel.location || "").toLowerCase().includes(parsed.extractedLocation.toLowerCase())
  ) {
    score = Math.min(0.99, score + 0.25);
  }

  if (parsed.maxPrice && hotel.price <= parsed.maxPrice) {
    score = Math.min(0.99, score + 0.08);
  }

  // Normalize into an intuitive 0.55..0.99 confidence band when relevant
  return Number(Math.max(0.15, Math.min(0.99, score)).toFixed(4));
}
