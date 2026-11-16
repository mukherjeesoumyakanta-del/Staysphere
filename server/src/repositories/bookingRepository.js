import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { BookingNight } from "../models/BookingNight.js";
import { BlockedDate } from "../models/BlockedDate.js";

/**
 * Expand [checkIn, checkOut) into array of "YYYY-MM-DD" nights
 */
export function getNightStrings(checkIn, checkOut) {
  const nights = [];
  const curr = new Date(checkIn + "T12:00:00Z");
  const end = new Date(checkOut + "T12:00:00Z");

  while (curr < end) {
    const year = curr.getUTCFullYear();
    const month = String(curr.getUTCMonth() + 1).padStart(2, "0");
    const day = String(curr.getUTCDate()).padStart(2, "0");
    nights.push(`${year}-${month}-${day}`);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return nights;
}

export const bookingRepository = {
  /**
   * Atomically reserve dates using BookingNight unique compound index.
   * Prevents race conditions and double bookings at the database level.
   */
  async createAtomic(bookingData) {
    const { listingId, checkIn, checkOut } = bookingData;
    const nights = getNightStrings(checkIn, checkOut);

    // 1. Check for overlapping host blocks [startDate, endDate)
    const blockOverlap = await BlockedDate.findOne({
      listingId,
      startDate: { $lt: checkOut },
      endDate: { $gt: checkIn },
    }).lean();

    if (blockOverlap) {
      return { overlap: true, reason: blockOverlap.reason || "HOST_BLOCKED" };
    }

    // 2. Pre-check for overlapping confirmed bookings
    const existingBooking = await Booking.findOne({
      listingId,
      status: "CONFIRMED",
      checkIn: { $lt: checkOut },
      checkOut: { $gt: checkIn },
    }).lean();

    if (existingBooking) {
      return { overlap: true, reason: "BOOKED" };
    }

    // 3. Atomically claim each night in BookingNight using unique constraint
    const bookingId = new mongoose.Types.ObjectId();
    const nightDocs = nights.map((date) => ({
      listingId,
      date,
      bookingId,
    }));

    try {
      await BookingNight.insertMany(nightDocs, { ordered: true });
    } catch (err) {
      // Code 11000 = duplicate key error: another concurrent request claimed one of these nights
      if (err.code === 11000 || err.name === "MongoServerError") {
        // Rollback any nights this request managed to insert before collision
        await BookingNight.deleteMany({ bookingId }).catch(() => {});
        return { overlap: true, reason: "BOOKED" };
      }
      throw err;
    }

    // 4. Create the Booking document
    try {
      const booking = await Booking.create({
        _id: bookingId,
        ...bookingData,
        totalNights: nights.length,
        status: "CONFIRMED",
      });
      return { booking: booking.toObject() };
    } catch (err) {
      // Rollback claimed nights if booking creation failed
      await BookingNight.deleteMany({ bookingId }).catch(() => {});
      throw err;
    }
  },

  async findByGuest(guestId) {
    return Booking.find({ guestId })
      .populate("listingId")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findByHost(hostId) {
    return Booking.find({ hostId })
      .populate("listingId")
      .populate("guestId", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findById(id) {
    return Booking.findById(id)
      .populate("listingId")
      .populate("guestId", "name email avatar")
      .lean();
  },

  async findConfirmedByListing(listingId) {
    return Booking.find({ listingId, status: "CONFIRMED" })
      .sort({ checkIn: 1 })
      .lean();
  },

  async cancel(id) {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { $set: { status: "CANCELLED" } },
      { new: true }
    )
      .populate("listingId")
      .populate("guestId", "name email avatar")
      .lean();

    if (booking) {
      // Free the reserved nights immediately
      await BookingNight.deleteMany({ bookingId: id }).catch(() => {});
    }

    return booking;
  },
};
