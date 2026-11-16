import mongoose from "mongoose";

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

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    propertyType: {
      type: String,
      enum: [
        "Apartment",
        "Villa",
        "Cabin",
        "Cottage",
        "Studio",
        "Farmhouse",
        "Treehouse",
        "Houseboat",
        "Homestay",
      ],
      required: true,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "pricePerNight must be an integer",
      },
    },
    maxGuests: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: "maxGuests must be an integer",
      },
    },
    bedrooms: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: "bedrooms must be an integer",
      },
    },
    bathrooms: {
      type: Number,
      required: true,
      min: 0,
      max: 20,
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE"],
      default: "DRAFT",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Performance & Scalability Indexes
// 1. hostId: Speeds up host dashboard property lookups (IXSCAN instead of COLLSCAN)
listingSchema.index({ hostId: 1 });
// 2. status + createdAt: Speeds up public discovery queries and default sort
listingSchema.index({ status: 1, createdAt: -1 });
// 3. status + city: Speeds up location-filtered searches
listingSchema.index({ status: 1, city: 1 });
// 4. status + pricePerNight: Speeds up price range filtering and price sorting
listingSchema.index({ status: 1, pricePerNight: 1 });

export const Listing = mongoose.model("Listing", listingSchema);
