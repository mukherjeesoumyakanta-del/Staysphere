import mongoose from "mongoose";
import { Listing } from "../models/Listing.js";

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

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ title: regex }, { city: regex }, { location: regex }];
    }
    if (city) filter.city = new RegExp(city, "i");
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.pricePerNight = {};
      if (minPrice !== undefined) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice !== undefined) filter.pricePerNight.$lte = Number(maxPrice);
    }
    if (maxGuests !== undefined) filter.maxGuests = { $gte: Number(maxGuests) };
    if (bedrooms !== undefined) filter.bedrooms = Number(bedrooms);
    if (propertyType) filter.propertyType = propertyType;
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      filter.amenities = { $all: amenityList };
    }

    let sortOrder = { createdAt: -1 };
    if (sort === "price_asc" || sort === "low") sortOrder = { pricePerNight: 1 };
    else if (sort === "price_desc" || sort === "high") sortOrder = { pricePerNight: -1 };
    else if (sort === "new" || sort === "created_desc") sortOrder = { createdAt: -1 };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(50, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      Listing.find(filter).sort(sortOrder).skip(skip).limit(limitNum).lean(),
      Listing.countDocuments(filter),
    ]);

    return {
      listings,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    };
  },

  async findById(id) {
    if (!id || !mongoose.isValidObjectId(id)) {
      return null;
    }
    return Listing.findById(id).lean();
  },

  async incrementViewCount(id) {
    if (!id || !mongoose.isValidObjectId(id)) return null;
    return Listing.updateOne({ _id: id }, { $inc: { viewCount: 1 } });
  },

  async findByHost(hostId) {
    return Listing.find({ hostId }).sort({ createdAt: -1 }).lean();
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
