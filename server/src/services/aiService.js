import { ApiError } from "../utils/ApiError.js";
import { createAiClient } from "./aiProvider.js";
import { listingRepository } from "../repositories/listingRepository.js";

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

/**
 * Fallback heuristic extractor when no LLM API key is configured
 * or when the LLM response is unparseable.
 */
function fallbackExtractFilters(prompt) {
  const s = prompt.toLowerCase();
  const filters = {};
  const amenitiesList = [];

  // Locations / destinations
  const knownCities = [
    "Goa",
    "Manali",
    "Jaipur",
    "Lonavala",
    "Darjeeling",
    "Bengaluru",
    "Mumbai",
    "Delhi",
    "Kerala",
    "Shimla",
    "Udaipur",
  ];
  for (const c of knownCities) {
    if (s.includes(c.toLowerCase())) {
      filters.city = c;
      break;
    }
  }

  // Property type
  for (const t of VALID_PROPERTY_TYPES) {
    if (s.includes(t.toLowerCase())) {
      filters.propertyType = t;
      break;
    }
  }

  // Max budget
  const maxMatch = s.match(
    /(?:under|below|budget|max|less than|up to)\s*(?:₹|rs\.?\s*)?([\d,]+)/i
  );
  if (maxMatch) {
    const val = parseInt(maxMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(val) && val > 0) filters.maxPrice = val;
  }

  // Min budget
  const minMatch = s.match(/(?:above|over|more than|at least)\s*(?:₹|rs\.?\s*)?([\d,]+)/i);
  if (minMatch) {
    const val = parseInt(minMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(val) && val >= 0) filters.minPrice = val;
  }

  // Guests
  const guestMatch = s.match(/(?:for\s+)?(\d+)\s*(?:guests?|people|persons?)/i);
  if (guestMatch) {
    const val = parseInt(guestMatch[1], 10);
    if (!isNaN(val) && val > 0) filters.guests = val;
  }

  // Bedrooms
  const bedMatch = s.match(/(\d+)\s*(?:bed(?:rooms?)?|bhk)/i);
  if (bedMatch) {
    const val = parseInt(bedMatch[1], 10);
    if (!isNaN(val) && val >= 0) filters.bedrooms = val;
  }

  // Amenities
  for (const a of VALID_AMENITIES) {
    const al = a.toLowerCase();
    if (
      s.includes(al) ||
      (a === "WiFi" && /wifi|wi-fi|internet/.test(s)) ||
      (a === "Swimming pool" && s.includes("pool")) ||
      (a === "Air conditioning" && /\bac\b|air condition/.test(s))
    ) {
      if (!amenitiesList.includes(a)) amenitiesList.push(a);
    }
  }
  if (amenitiesList.length > 0) {
    filters.amenities = amenitiesList;
  }

  return filters;
}

/**
 * Validate LLM extracted filter object against a strict schema.
 * Only allowed keys: city, maxPrice, minPrice, guests, bedrooms, propertyType, amenities.
 * Strips any disallowed keys or potential MongoDB operator injections.
 */
export function validateAiFilters(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const validated = {};

  // city: string only, sanitize letters, spaces, hyphens
  if (typeof raw.city === "string" && raw.city.trim().length > 0) {
    const cleanCity = raw.city.trim().replace(/[^\w\s-]/gi, "").slice(0, 50);
    if (cleanCity.length > 0) validated.city = cleanCity;
  }

  // maxPrice: positive number
  if (raw.maxPrice !== undefined && raw.maxPrice !== null) {
    const num = Number(raw.maxPrice);
    if (Number.isFinite(num) && num > 0) {
      validated.maxPrice = Math.round(num);
    }
  }

  // minPrice: non-negative number
  if (raw.minPrice !== undefined && raw.minPrice !== null) {
    const num = Number(raw.minPrice);
    if (Number.isFinite(num) && num >= 0) {
      validated.minPrice = Math.round(num);
    }
  }

  // guests: positive integer
  if (raw.guests !== undefined && raw.guests !== null) {
    const num = parseInt(raw.guests, 10);
    if (!isNaN(num) && num >= 1 && num <= 50) {
      validated.guests = num;
    }
  }

  // bedrooms: non-negative integer
  if (raw.bedrooms !== undefined && raw.bedrooms !== null) {
    const num = parseInt(raw.bedrooms, 10);
    if (!isNaN(num) && num >= 0 && num <= 20) {
      validated.bedrooms = num;
    }
  }

  // propertyType: whitelist check
  if (typeof raw.propertyType === "string" && raw.propertyType.trim().length > 0) {
    const match = VALID_PROPERTY_TYPES.find(
      (t) => t.toLowerCase() === raw.propertyType.trim().toLowerCase()
    );
    if (match) validated.propertyType = match;
  }

  // amenities: array of valid amenities
  if (Array.isArray(raw.amenities)) {
    const cleaned = [];
    for (const item of raw.amenities) {
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
}

export function createAiService(
  config = {},
  { aiClient = createAiClient(config), listingRepo = listingRepository } = {}
) {
  return {
    /**
     * Search listings using natural language prompt.
     * Extracts structured filters and queries real ACTIVE listings from MongoDB.
     */
    async searchListings(prompt) {
      if (typeof prompt !== "string" || prompt.trim().length === 0) {
        throw new ApiError(400, "INVALID_PROMPT", "Search prompt is required.");
      }
      if (prompt.trim().length > 500) {
        throw new ApiError(
          400,
          "PROMPT_TOO_LONG",
          "Search prompt must be at most 500 characters."
        );
      }

      const cleanPrompt = prompt.trim();
      let extracted = {};
      let usedProvider = "fallback";

      if (aiClient && aiClient.isConfigured()) {
        try {
          const systemInstructions = `You are a search query parser for StaySphere rental properties.
Extract search filters from this user request: "${cleanPrompt}".
Return ONLY a valid JSON object with these optional keys (use null or omit if not specified):
- "city": string (e.g. "Goa", "Manali")
- "maxPrice": number (maximum price per night in INR)
- "minPrice": number (minimum price per night in INR)
- "guests": integer (guest count required)
- "bedrooms": integer (bedroom count required)
- "propertyType": string ("Apartment", "Villa", "Cabin", "Cottage", "Homestay", "Studio", "Farmhouse", "Treehouse", "Houseboat")
- "amenities": array of strings (e.g. ["WiFi", "Pool", "Kitchen", "AC", "Parking", "Mountain view"])

Return raw JSON only, no markdown, no quotes around json, no preamble.`;

          const result = await aiClient.generateText(systemInstructions, {
            temperature: 0.1,
            maxTokens: 300,
          });

          // Clean markdown backticks if returned
          let text = result.text.trim();
          text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(text);
          extracted = validateAiFilters(parsed);
          usedProvider = result.provider || "llm";
        } catch (err) {
          console.warn("LLM search extraction failed, falling back to heuristic:", err.message);
          extracted = fallbackExtractFilters(cleanPrompt);
          usedProvider = "fallback";
        }
      } else {
        extracted = fallbackExtractFilters(cleanPrompt);
      }

      // Query real ACTIVE MongoDB listings with safe mapped filters
      const queryParams = {
        city: extracted.city,
        maxPrice: extracted.maxPrice,
        minPrice: extracted.minPrice,
        maxGuests: extracted.guests,
        bedrooms: extracted.bedrooms,
        propertyType: extracted.propertyType,
        amenities: extracted.amenities,
        limit: 20,
      };

      const searchResult = await listingRepo.search(queryParams);
      const listings = searchResult?.listings || [];

      let explanation = "";
      if (listings.length > 0) {
        explanation = `Found ${listings.length} active propert${
          listings.length === 1 ? "y" : "ies"
        } matching your criteria.`;
      } else {
        const parts = [];
        if (extracted.city) parts.push(`in ${extracted.city}`);
        if (extracted.maxPrice) parts.push(`under ₹${extracted.maxPrice.toLocaleString("en-IN")}`);
        if (extracted.propertyType) parts.push(`type ${extracted.propertyType}`);
        explanation = `No active properties currently match ${
          parts.length > 0 ? parts.join(" ") : "your search criteria"
        }. Try expanding your budget or destination.`;
      }

      return {
        prompt: cleanPrompt,
        filters: extracted,
        total: listings.length,
        listings,
        explanation,
        provider: usedProvider,
        configured: Boolean(aiClient && aiClient.isConfigured()),
      };
    },

    /**
     * Generate an engaging, strictly grounded property description for hosts.
     * Never invents amenities or facts not provided by the host.
     */
    async generateListingDescription(facts) {
      if (!facts || typeof facts !== "object") {
        throw new ApiError(400, "INVALID_FACTS", "Property facts must be provided.");
      }

      const title = String(facts.title || facts.name || "").trim();
      const location = String(facts.location || [facts.city, facts.state].filter(Boolean).join(", ") || "").trim();
      const propertyType = String(facts.propertyType || facts.type || "property").trim();
      const bedrooms = Number(facts.bedrooms ?? 1);
      const bathrooms = Number(facts.bathrooms ?? 1);
      const maxGuests = Number(facts.maxGuests || facts.guests || 2);
      const pricePerNight = Number(facts.pricePerNight || facts.price || 0);
      const amenities = Array.isArray(facts.amenities)
        ? facts.amenities.filter((a) => typeof a === "string" && a.trim().length > 0)
        : [];
      const highlights = String(facts.highlights || "").trim();

      if (!title || title.length < 3) {
        throw new ApiError(400, "TITLE_REQUIRED", "Property title must be at least 3 characters.");
      }
      if (!location) {
        throw new ApiError(400, "LOCATION_REQUIRED", "Property location is required.");
      }

      if (aiClient && aiClient.isConfigured()) {
        try {
          const prompt = `You are a hospitality and architectural copywriter for StaySphere.
Write an authentic, inviting listing description for this rental property strictly based on these facts:
- Title: ${title}
- Property Type: ${propertyType}
- Location: ${location}
- Bedrooms: ${bedrooms}
- Bathrooms: ${bathrooms}
- Accommodates: ${maxGuests} guests
- Price: ₹${pricePerNight ? pricePerNight.toLocaleString("en-IN") : "Competitive"} per night
- Provided Amenities: ${amenities.length > 0 ? amenities.join(", ") : "Essential comforts"}
${highlights ? `- Highlights from host: ${highlights}` : ""}

STRICT FACTUAL GROUNDING RULES:
1. ONLY describe what is provided in the facts above.
2. DO NOT invent or assume amenities not listed (e.g. do not say 'ocean view' or 'hot tub' unless listed).
3. Do not invent awards, star ratings, or fabricated reviews.
4. Keep the description between 60 and 150 words.
5. Provide only the finished description text without markdown headings or greetings.`;

          const response = await aiClient.generateText(prompt, {
            temperature: 0.3,
            maxTokens: 350,
          });

          return {
            description: response.text.trim(),
            provider: response.provider,
            model: response.model,
          };
        } catch (err) {
          console.warn("LLM description generation failed, falling back to template:", err.message);
        }
      }

      // Truthful grounded fallback when LLM is unavailable or unconfigured
      const amenityClause = amenities.length > 0
        ? ` Amenities include ${amenities.join(", ")}.`
        : "";
      const highlightClause = highlights ? ` ${highlights}.` : "";
      const priceClause = pricePerNight > 0
        ? ` Available starting at ₹${Number(pricePerNight).toLocaleString("en-IN")} per night.`
        : "";

      const description = `Welcome to ${title}, an exceptional ${propertyType.toLowerCase()} nestled in ${location}. Designed for comfort and relaxation, this space features ${bedrooms} bedroom${
        bedrooms === 1 ? "" : "s"
      }, ${bathrooms} bathroom${
        bathrooms === 1 ? "" : "s"
      }, and generously hosts up to ${maxGuests} guests.${amenityClause}${highlightClause}${priceClause} Ideal for your next peaceful getaway.`;

      return {
        description,
        provider: "fallback",
        model: "template",
      };
    },
  };
}
