import { ApiError } from "../utils/ApiError.js";
import { createAiClient } from "./aiProvider.js";
import { listingRepository } from "../repositories/listingRepository.js";
import { aiPrivacyService } from "./aiPrivacyService.js";

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

export function validateAiFilters(raw) {
  return aiPrivacyService.validateAiFilters(raw);
}

export function createAiService(
  config = {},
  { aiClient = createAiClient(config), listingRepo = listingRepository } = {}
) {
  return {
    /**
     * Search listings using natural language prompt.
     * Sanitizes prompt through aiPrivacyService, extracts structured filters,
     * queries real ACTIVE listings from MongoDB, and tracks latency splits.
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

      // 1. Sanitize prompt & scrub PII / credentials via privacy gateway
      let cleanPrompt;
      try {
        cleanPrompt = aiPrivacyService.sanitizeSearchPrompt(prompt);
      } catch (err) {
        throw new ApiError(400, "INVALID_PROMPT", err.message);
      }

      const totalStart = performance.now();
      let llmDurationMs = 0;
      let dbDurationMs = 0;
      let extracted = {};
      let usedProvider = "fallback";

      // 2. Extract deterministic filters locally first (< 1ms)
      const localFilters = aiPrivacyService.extractDeterministicFilters(cleanPrompt);

      if (aiClient && aiClient.isConfigured()) {
        const llmStart = performance.now();
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

          llmDurationMs = Math.round(performance.now() - llmStart);

          // Clean markdown backticks if returned
          let text = result.text.trim();
          text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
          const parsed = JSON.parse(text);
          const validated = aiPrivacyService.validateAiFilters(parsed);
          // Merge local deterministic filters with LLM extracted filters
          extracted = { ...localFilters, ...validated };
          usedProvider = result.provider || "llm";
        } catch (err) {
          llmDurationMs = Math.round(performance.now() - llmStart);
          extracted = localFilters;
          usedProvider = "deterministic_fallback";
        }
      } else {
        extracted = localFilters;
      }

      // 3. Query real ACTIVE MongoDB listings with safe mapped filters
      const queryParams = {
        city: extracted.city,
        maxPrice: extracted.maxPrice,
        minPrice: extracted.minPrice,
        maxGuests: extracted.maxGuests || extracted.guests,
        bedrooms: extracted.bedrooms,
        propertyType: extracted.propertyType,
        amenities: extracted.amenities,
        limit: 20,
      };

      const dbStart = performance.now();
      const searchResult = await listingRepo.search(queryParams);
      dbDurationMs = Math.round(performance.now() - dbStart);
      const totalDurationMs = Math.round(performance.now() - totalStart);

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
        timings: {
          llmDurationMs,
          dbDurationMs,
          totalDurationMs,
        },
      };
    },

    /**
     * Generate an engaging, strictly grounded property description for hosts.
     * Sanitizes facts through aiPrivacyService so private addresses or PII
     * never reach external LLM endpoints.
     */
    async generateListingDescription(facts) {
      if (!facts || typeof facts !== "object") {
        throw new ApiError(400, "INVALID_FACTS", "Property facts must be provided.");
      }

      const cleanFacts = aiPrivacyService.sanitizeDescriptionFacts(facts);

      const title = String(cleanFacts.title || facts.title || facts.name || "").trim();
      const city = cleanFacts.city || facts.city || "";
      const state = cleanFacts.state || facts.state || "";
      const location = [city, state].filter(Boolean).join(", ") || String(facts.location || "").trim();
      const propertyType = String(cleanFacts.propertyType || facts.propertyType || facts.type || "Villa").trim();
      const bedrooms = Number(cleanFacts.bedrooms ?? facts.bedrooms ?? 1);
      const bathrooms = Number(cleanFacts.bathrooms ?? facts.bathrooms ?? 1);
      const maxGuests = Number(cleanFacts.maxGuests || facts.maxGuests || facts.guests || 2);
      const pricePerNight = Number(facts.pricePerNight || facts.price || 0);
      const amenities = Array.isArray(cleanFacts.amenities)
        ? cleanFacts.amenities
        : Array.isArray(facts.amenities)
        ? facts.amenities
        : [];
      const highlights = String(cleanFacts.highlights || "").trim();

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
