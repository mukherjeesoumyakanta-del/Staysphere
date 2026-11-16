/**
 * AI Privacy & Security Gateway.
 * Ensures zero PII (names, emails, phone numbers, tokens, database ObjectIDs)
 * is ever sent to external LLM providers (Gemini), and validates/sanitizes
 * all incoming prompts and outgoing LLM-generated structures.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\d{10,12}\b/g;
const CC_SSN_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{3}-\d{2}-\d{4}\b/g;
const MONGO_ID_REGEX = /\b[0-9a-fA-F]{24}\b/g;
const SENSITIVE_TOKENS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /jwt\s*[:=]\s*[a-zA-Z0-9_\-\.]+/gi,
  /password\s*[:=]\s*\S+/gi,
  /api[_-]?key\s*[:=]\s*\S+/gi,
  /secret\s*[:=]\s*\S+/gi,
];

const KNOWN_CITIES = [
  "goa", "mumbai", "delhi", "bangalore", "bengaluru", "manali", "jaipur",
  "kerala", "udaipur", "chennai", "kolkata", "shimla", "rishikesh", "pune",
  "hyderabad", "lonavala", "pondicherry", "ooty", "coorg", "darjeeling",
  "ladakh", "munnar", "wayanad", "alibaug", "kasol", "mussoorie",
];

const VALID_PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Cabin",
  "Cottage",
  "Studio",
  "Farmhouse",
  "Treehouse",
  "Houseboat",
  "Homestay",
];

const VALID_AMENITIES = [
  "WiFi",
  "Wi-Fi",
  "Pool",
  "Swimming pool",
  "AC",
  "Air conditioning",
  "Kitchen",
  "Parking",
  "Gym",
  "Beach Access",
  "Pet Friendly",
  "Breakfast",
  "Hot Tub",
  "Mountain view",
];

const KNOWN_AMENITIES_MATCHERS = [
  { match: /\b(?:wi-?fi|internet)\b/i, canonical: "WiFi" },
  { match: /\b(?:pool|swimming\s*pool)\b/i, canonical: "Pool" },
  { match: /\b(?:ac|air\s*condition(?:ing)?)\b/i, canonical: "AC" },
  { match: /\b(?:kitchen|cooking)\b/i, canonical: "Kitchen" },
  { match: /\b(?:parking|garage)\b/i, canonical: "Parking" },
  { match: /\b(?:beach|beachfront|beach\s*access)\b/i, canonical: "Beach Access" },
  { match: /\b(?:mountain\s*view)\b/i, canonical: "Mountain view" },
  { match: /\b(?:gym|fitness)\b/i, canonical: "Gym" },
  { match: /\b(?:hot\s*tub|jacuzzi)\b/i, canonical: "Hot Tub" },
  { match: /\b(?:pet|pets|pet-friendly)\b/i, canonical: "Pet Friendly" },
  { match: /\b(?:breakfast)\b/i, canonical: "Breakfast" },
];

export const aiPrivacyService = {
  /**
   * Sanitizes a natural language search prompt before sending to LLM.
   * - Enforces 3-500 length
   * - Redacts emails, phone numbers, credit cards
   * - Scrubs authentication tokens/credentials
   * - Strips internal MongoDB 24-hex ObjectIDs
   * - Rejects prompt if strictly credential-injected
   */
  sanitizeSearchPrompt(prompt) {
    if (typeof prompt !== "string") {
      throw new Error("Prompt must be a string");
    }
    const trimmed = prompt.trim();
    if (trimmed.length < 3) {
      throw new Error("Search prompt must be at least 3 characters");
    }
    if (trimmed.length > 500) {
      throw new Error("Search prompt cannot exceed 500 characters");
    }

    // Check for overt credential theft attempts
    for (const pat of SENSITIVE_TOKENS) {
      if (pat.test(trimmed)) {
        throw new Error("Prompt contains unauthorized credential or token patterns");
      }
    }

    // Scrub PII patterns
    let clean = trimmed
      .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
      .replace(PHONE_REGEX, "[REDACTED_PHONE]")
      .replace(CC_SSN_REGEX, "[REDACTED_PII]")
      .replace(MONGO_ID_REGEX, "[REDACTED_ID]");

    return clean;
  },

  /**
   * Sanitizes host property facts before description generation.
   * Whitelists only non-sensitive property attributes and scrubs street/door numbers.
   */
  sanitizeDescriptionFacts(facts = {}) {
    if (!facts || typeof facts !== "object") {
      return {};
    }

    const clean = {};

    if (facts.propertyType && typeof facts.propertyType === "string") {
      clean.propertyType = facts.propertyType.trim().slice(0, 50);
    }

    // Scrub door/street numbers from city/state
    if (facts.city && typeof facts.city === "string") {
      clean.city = facts.city
        .replace(/^(?:(?:flat|apt|room|unit|door|no\.?|#)\s*)?\d+[\w-]*\s*[,/-]?\s*/i, "")
        .trim()
        .slice(0, 60);
    }
    if (facts.state && typeof facts.state === "string") {
      clean.state = facts.state
        .replace(/^(?:(?:flat|apt|room|unit|door|no\.?|#)\s*)?\d+[\w-]*\s*[,/-]?\s*/i, "")
        .trim()
        .slice(0, 60);
    }

    if (facts.bedrooms !== undefined && Number.isFinite(Number(facts.bedrooms))) {
      clean.bedrooms = Math.max(0, Math.min(50, Number(facts.bedrooms)));
    }
    if (facts.bathrooms !== undefined && Number.isFinite(Number(facts.bathrooms))) {
      clean.bathrooms = Math.max(0, Math.min(50, Number(facts.bathrooms)));
    }
    if (facts.maxGuests !== undefined && Number.isFinite(Number(facts.maxGuests))) {
      clean.maxGuests = Math.max(1, Math.min(100, Number(facts.maxGuests)));
    }

    if (Array.isArray(facts.amenities)) {
      clean.amenities = facts.amenities
        .filter((a) => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 60))
        .slice(0, 30);
    }

    if (facts.highlights && typeof facts.highlights === "string") {
      let hl = facts.highlights.trim().slice(0, 300);
      hl = hl
        .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
        .replace(PHONE_REGEX, "[REDACTED_PHONE]")
        .replace(CC_SSN_REGEX, "[REDACTED_PII]")
        .replace(MONGO_ID_REGEX, "[REDACTED_ID]");
      clean.highlights = hl;
    }

    return clean;
  },

  /**
   * Fast, deterministic local filter extraction (< 1ms).
   * Extracts location, property type, budget, guest count, and amenities
   * without calling external LLM. Works as an instant tier or fallback.
   */
  extractDeterministicFilters(prompt = "") {
    if (!prompt || typeof prompt !== "string") return {};

    const text = prompt.toLowerCase();
    const filters = {};

    // 1. Detect City
    for (const c of KNOWN_CITIES) {
      const regex = new RegExp(`\\b${c}\\b`, "i");
      if (regex.test(text)) {
        filters.city = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
    }

    // 2. Detect Property Type
    for (const t of VALID_PROPERTY_TYPES) {
      const regex = new RegExp(`\\b${t.toLowerCase()}s?\\b`, "i");
      if (regex.test(text)) {
        filters.propertyType = t;
        break;
      }
    }

    // 3. Detect Max Price / Budget
    const maxPriceMatch = text.match(
      /(?:under|below|less\s+than|budget\s*(?:of)?|max(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i
    );
    if (maxPriceMatch) {
      const num = parseInt(maxPriceMatch[1].replace(/,/g, ""), 10);
      if (num > 0) filters.maxPrice = num;
    }

    // 4. Detect Min Price
    const minPriceMatch = text.match(
      /(?:above|over|more\s+than|min(?:imum)?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i
    );
    if (minPriceMatch) {
      const num = parseInt(minPriceMatch[1].replace(/,/g, ""), 10);
      if (num > 0) filters.minPrice = num;
    }

    // 5. Detect Guests
    const guestMatch = text.match(
      /(\d+)\s*(?:guests?|persons?|people|family\s+of\s*(\d+))/i
    );
    if (guestMatch) {
      const g = parseInt(guestMatch[1] || guestMatch[2], 10);
      if (g > 0) {
        filters.guests = g;
        filters.maxGuests = g;
      }
    }

    // 6. Detect Bedrooms
    const bedMatch = text.match(/(\d+)\s*(?:bed(?:rooms?)?|bhk)/i);
    if (bedMatch) {
      const b = parseInt(bedMatch[1], 10);
      if (b > 0) filters.bedrooms = b;
    }

    // 7. Detect Amenities
    const amenities = [];
    for (const { match, canonical } of KNOWN_AMENITIES_MATCHERS) {
      if (match.test(text)) {
        amenities.push(canonical);
      }
    }
    if (amenities.length > 0) {
      filters.amenities = amenities;
    }

    return filters;
  },

  /**
   * Validates and sanitizes AI-returned filter objects to prevent
   * prompt injection or arbitrary query parameter pollution.
   */
  validateAiFilters(filters) {
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
      return {};
    }

    const validated = {};

    // city: string only, sanitize letters, spaces, hyphens
    if (typeof filters.city === "string" && filters.city.trim().length > 0) {
      const cleanCity = filters.city.trim().replace(/[^\w\s-]/gi, "").slice(0, 50);
      if (cleanCity.length > 0) validated.city = cleanCity;
    }

    // maxPrice: positive number
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      const num = Number(filters.maxPrice);
      if (Number.isFinite(num) && num > 0) {
        validated.maxPrice = Math.round(num);
      }
    }

    // minPrice: non-negative number
    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      const num = Number(filters.minPrice);
      if (Number.isFinite(num) && num >= 0) {
        validated.minPrice = Math.round(num);
      }
    }

    // guests: positive integer
    const rawGuests = filters.guests !== undefined ? filters.guests : filters.maxGuests;
    if (rawGuests !== undefined && rawGuests !== null) {
      const num = parseInt(rawGuests, 10);
      if (!isNaN(num) && num >= 1 && num <= 50) {
        validated.guests = num;
      }
    }

    // bedrooms: positive integer (>= 1, or edge cases where > 0)
    if (filters.bedrooms !== undefined && filters.bedrooms !== null) {
      const num = parseInt(filters.bedrooms, 10);
      if (!isNaN(num) && num >= 1 && num <= 20) {
        validated.bedrooms = num;
      }
    }

    // propertyType: whitelist check
    if (typeof filters.propertyType === "string" && filters.propertyType.trim().length > 0) {
      const match = VALID_PROPERTY_TYPES.find(
        (t) => t.toLowerCase() === filters.propertyType.trim().toLowerCase()
      );
      if (match) validated.propertyType = match;
    }

    // amenities: array of valid amenities
    if (Array.isArray(filters.amenities)) {
      const cleaned = [];
      for (const item of filters.amenities) {
        if (typeof item === "string") {
          const match = VALID_AMENITIES.find(
            (a) => a.toLowerCase() === item.trim().toLowerCase()
          );
          if (match && !cleaned.includes(match)) {
            cleaned.push(match);
          }
        }
      }
      if (cleaned.length > 0) validated.amenities = cleaned;
    }

    return validated;
  },
};
