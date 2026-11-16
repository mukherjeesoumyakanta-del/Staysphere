import mongoose from "mongoose";

const bookingNightSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Enforce atomic unique occupancy per listing per night at the database engine level
bookingNightSchema.index({ listingId: 1, date: 1 }, { unique: true });

export const BookingNight = mongoose.model("BookingNight", bookingNightSchema);
