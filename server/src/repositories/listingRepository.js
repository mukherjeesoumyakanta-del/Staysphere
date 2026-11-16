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
  async search({
    q,
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
    const filter = { status: "ACTIVE" };

    if (typeof q === "string" && q.trim().length > 0) {
      const safeQ = escapeRegex(q.trim().slice(0, 100));
      const regex = new RegExp(safeQ, "i");
      filter.$or = [{ title: regex }, { city: regex }, { location: regex }];
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

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

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
      pages: Math.ceil(total / limitNum),
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
