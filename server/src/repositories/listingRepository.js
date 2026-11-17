import mongoose from "mongoose";
import { Listing } from "../models/Listing.js";
import {
  serializePublicListing,
  serializeHostListing,
} from "../serializers/listingSerializer.js";

/** Escape regex special characters to prevent ReDoS and regex injection */
function escapeRegex(str) {
  return typeof str === "string" ? str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : "";
}

const PUBLIC_PROJECTION = {
  _id: 1,
  title: 1,
  description: 1,
  city: 1,
  state: 1,
  location: 1,
  propertyType: 1,
  pricePerNight: 1,
  maxGuests: 1,
  bedrooms: 1,
  bathrooms: 1,
  amenities: 1,
  images: 1,
  status: 1,
  viewCount: 1,
  hostId: 1,
  createdAt: 1,
  updatedAt: 1,
};

export const listingRepository = {
  /**
   * Executes MongoDB Atlas Vector Search ($vectorSearch).
   * Ranks active listings by cosine similarity to the query vector.
   */
  async vectorSearch({
    queryVector,
    indexName = "property_vector_index",
    filters = {},
    limit = 12,
    numCandidates = 50,
  } = {}) {
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error("Valid query vector is required for vector search");
    }

    // Build Atlas Vector pre-filter
    const vectorFilter = {
      status: { $eq: "ACTIVE" },
    };

    if (filters.city && typeof filters.city === "string") {
      vectorFilter.city = { $eq: filters.city };
    }
    if (filters.propertyType && typeof filters.propertyType === "string") {
      vectorFilter.propertyType = { $eq: filters.propertyType };
    }

    const pipeline = [
      {
        $vectorSearch: {
          index: indexName,
          path: "embedding",
          queryVector,
          numCandidates: Math.max(numCandidates, limit * 2),
          limit: Math.max(1, Math.min(50, limit)),
          filter: vectorFilter,
        },
      },
    ];

    // Post-filter stages for filters not handled inside vector pre-filter
    const postMatch = {};
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      postMatch.pricePerNight = {};
      if (filters.minPrice !== undefined && Number.isFinite(Number(filters.minPrice))) {
        postMatch.pricePerNight.$gte = Number(filters.minPrice);
      }
      if (filters.maxPrice !== undefined && Number.isFinite(Number(filters.maxPrice))) {
        postMatch.pricePerNight.$lte = Number(filters.maxPrice);
      }
    }
    if (filters.maxGuests !== undefined && Number.isFinite(Number(filters.maxGuests))) {
      postMatch.maxGuests = { $gte: Number(filters.maxGuests) };
    }
    if (filters.bedrooms !== undefined && Number.isFinite(Number(filters.bedrooms))) {
      postMatch.bedrooms = { $gte: Number(filters.bedrooms) };
    }
    if (filters.amenities) {
      const amenityList = Array.isArray(filters.amenities)
        ? filters.amenities.filter((a) => typeof a === "string" && a.trim().length > 0)
        : typeof filters.amenities === "string"
        ? [filters.amenities.trim()]
        : [];
      if (amenityList.length > 0) {
        postMatch.amenities = { $all: amenityList };
      }
    }

    if (Object.keys(postMatch).length > 0) {
      pipeline.push({ $match: postMatch });
    }

    // Project fields without exposing raw vector arrays
    pipeline.push({
      $project: {
        ...PUBLIC_PROJECTION,
        similarityScore: { $meta: "vectorSearchScore" },
      },
    });

    const docs = await Listing.aggregate(pipeline);
    return docs || [];
  },

  /**
   * Search listings supporting both Semantic Vector Search and standard B-Tree filter queries.
   */
  async search({
    q,
    search,
    queryVector,
    vectorIndexName = "property_vector_index",
    city,
    minPrice,
    maxPrice,
    maxGuests,
    bedrooms,
    propertyType,
    amenities,
    sort,
    page = 1,
    limit = 12,
  } = {}) {
    const rawQuery = (search || q || "").trim();
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    // 1. Attempt Atlas Vector Search if queryVector is provided
    if (Array.isArray(queryVector) && queryVector.length > 0) {
      try {
        const vectorResults = await this.vectorSearch({
          queryVector,
          indexName: vectorIndexName,
          filters: { city, minPrice, maxPrice, maxGuests, bedrooms, propertyType, amenities },
          limit: limitNum * pageNum,
          numCandidates: 100,
        });

        if (Array.isArray(vectorResults) && vectorResults.length > 0) {
          const paged = vectorResults.slice(skip, skip + limitNum);
          return {
            listings: paged.map((doc) => {
              const item = serializePublicListing(doc);
              if (doc.similarityScore !== undefined) {
                item.similarityScore = Number(doc.similarityScore.toFixed(4));
              }
              return item;
            }),
            total: vectorResults.length,
            page: pageNum,
            pages: Math.ceil(vectorResults.length / limitNum) || 1,
            searchMode: "vector",
          };
        }
      } catch (err) {
        // Graceful fallback to keyword search if vector index is missing or Atlas aggregation fails
        console.warn(
          "MongoDB Atlas Vector Search unavailable, falling back to keyword search:",
          err.message
        );
      }
    }

    // 2. Standard B-Tree / Text Filter Fallback
    const filter = { status: "ACTIVE" };

    if (typeof rawQuery === "string" && rawQuery.length > 0) {
      const safeQ = escapeRegex(rawQuery.slice(0, 100));
      const regex = new RegExp(safeQ, "i");
      filter.$or = [
        { title: regex },
        { city: regex },
        { location: regex },
        { searchText: regex },
        { description: regex },
      ];
    }
    if (typeof city === "string" && city.trim().length > 0) {
      const safeCity = escapeRegex(city.trim().slice(0, 80));
      filter.city = new RegExp(safeCity, "i");
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.pricePerNight = {};
      if (minPrice !== undefined && Number.isFinite(Number(minPrice))) {
        filter.pricePerNight.$gte = Math.max(0, Number(minPrice));
      }
      if (maxPrice !== undefined && Number.isFinite(Number(maxPrice))) {
        filter.pricePerNight.$lte = Math.max(0, Number(maxPrice));
      }
    }
    if (maxGuests !== undefined && Number.isFinite(Number(maxGuests))) {
      filter.maxGuests = { $gte: Math.max(1, Number(maxGuests)) };
    }
    if (bedrooms !== undefined && Number.isFinite(Number(bedrooms))) {
      filter.bedrooms = Math.max(0, Number(bedrooms));
    }
    if (typeof propertyType === "string" && propertyType.trim().length > 0) {
      filter.propertyType = propertyType.trim();
    }
    if (amenities) {
      const amenityList = Array.isArray(amenities)
        ? amenities.filter((a) => typeof a === "string" && a.trim().length > 0)
        : typeof amenities === "string"
        ? [amenities.trim()]
        : [];
      if (amenityList.length > 0) {
        filter.amenities = { $all: amenityList };
      }
    }

    let sortOrder = { createdAt: -1 };
    if (sort === "price_asc" || sort === "low") sortOrder = { pricePerNight: 1 };
    else if (sort === "price_desc" || sort === "high") sortOrder = { pricePerNight: -1 };
    else if (sort === "new" || sort === "created_desc") sortOrder = { createdAt: -1 };

    const [listings, total] = await Promise.all([
      Listing.find(filter, PUBLIC_PROJECTION)
        .sort(sortOrder)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    return {
      listings: (listings || []).map(serializePublicListing),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      searchMode: rawQuery ? "keyword_fallback" : "standard",
    };
  },

  async findById(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      return null;
    }
    const doc = await Listing.findById(id, PUBLIC_PROJECTION).lean();
    return doc ? serializePublicListing(doc) : null;
  },

  async incrementViewCount(id) {
    if (!id || !mongoose.isValidObjectId(id)) return null;
    return Listing.updateOne({ _id: id }, { $inc: { viewCount: 1 } });
  },

  async findByHost(hostId) {
    const list = await Listing.find({ hostId }).sort({ createdAt: -1 }).lean();
    return (list || []).map(serializeHostListing);
  },

  async create(data) {
    return Listing.create(data);
  },

  async update(id, data) {
    return Listing.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    ).lean();
  },

  async remove(id) {
    return Listing.deleteOne({ _id: id });
  },
};
