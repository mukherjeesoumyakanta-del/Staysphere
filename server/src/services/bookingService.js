import { ApiError } from "../utils/ApiError.js";
import {
  bookingRepository,
  getNightStrings,
} from "../repositories/bookingRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";
import {
  serializeGuestBooking,
  serializeHostBooking,
} from "../serializers/bookingSerializer.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBooking(b) {
  return serializeGuestBooking(b);
}

export function createBookingService(
  config,
  {
    bookingRepo = bookingRepository,
    listingRepo = listingRepository,
  } = {}
) {
  return {
    async create(guestId, { listingId, checkIn, checkOut }) {
      if (!listingId) {
        throw new ApiError(400, "VALIDATION_ERROR", "listingId is required");
      }
      if (!checkIn || !checkOut) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "checkIn and checkOut dates are required"
        );
      }

      const sIn = String(checkIn).trim();
      const sOut = String(checkOut).trim();

      if (!DATE_REGEX.test(sIn) || !DATE_REGEX.test(sOut)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Dates must be in YYYY-MM-DD format"
        );
      }

      if (sIn >= sOut) {
        throw new ApiError(
          400,
          "INVALID_DATE_RANGE",
          "checkIn must be strictly before checkOut"
        );
      }

      const today = getTodayString();
      if (sIn < today) {
        throw new ApiError(
          400,
          "PAST_DATE_NOT_ALLOWED",
          "Cannot book dates in the past"
        );
      }

      // Check listing exists and is ACTIVE
      const listing = await listingRepo.findById(listingId);
      if (!listing) {
        throw new ApiError(404, "NOT_FOUND", "Listing not found");
      }
      if (listing.status !== "ACTIVE") {
        throw new ApiError(
          400,
          "LISTING_NOT_ACTIVE",
          "Only active listings can be booked"
        );
      }

      // Check guest is not the host of this property
      if (String(listing.hostId) === String(guestId)) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Hosts cannot book their own property"
        );
      }

      // Server-side financial & duration calculation (prevents client price-tampering)
      const nights = getNightStrings(sIn, sOut);
      const totalNights = nights.length;
      const totalPrice = totalNights * listing.pricePerNight;

      // Atomic reservation with unique BookingNight compound index:
      // Guarantees zero double-booking even under concurrent race conditions.
      const result = await bookingRepo.createAtomic({
        listingId,
        guestId,
        hostId: listing.hostId,
        checkIn: sIn,
        checkOut: sOut,
        totalNights,
        totalPrice,
      });

      if (result.overlap) {
        throw new ApiError(
          409,
          "DATES_UNAVAILABLE",
          "These dates are already booked. Please choose another date range."
        );
      }

      return formatBooking(result.booking);
    },

    async getMyBookings(guestId) {
      const bookings = await bookingRepo.findByGuest(guestId);
      return bookings.map(serializeGuestBooking);
    },

    async getHostBookings(hostId) {
      const bookings = await bookingRepo.findByHost(hostId);
      return bookings.map(serializeHostBooking);
    },

    async getBooking(id, userId) {
      const booking = await bookingRepo.findById(id);
      if (!booking) {
        throw new ApiError(404, "NOT_FOUND", "Booking not found");
      }

      const guestIdStr = String(booking.guestId?._id || booking.guestId);
      const hostIdStr = String(booking.hostId?._id || booking.hostId);
      const userIdStr = String(userId);

      if (userIdStr !== guestIdStr && userIdStr !== hostIdStr) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "You are not authorized to view this booking"
        );
      }

      if (userIdStr === hostIdStr) {
        return serializeHostBooking(booking);
      }
      return serializeGuestBooking(booking);
    },

    async cancelBooking(id, guestId) {
      const booking = await bookingRepo.findById(id);
      if (!booking) {
        throw new ApiError(404, "NOT_FOUND", "Booking not found");
      }

      const guestIdStr = String(booking.guestId?._id || booking.guestId);
      if (String(guestId) !== guestIdStr) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "Only the guest who booked can cancel this reservation"
        );
      }

      if (booking.status === "CANCELLED") {
        throw new ApiError(
          400,
          "ALREADY_CANCELLED",
          "This booking has already been cancelled"
        );
      }

      const updated = await bookingRepo.cancel(id);
      return formatBooking(updated);
    },
  };
}
