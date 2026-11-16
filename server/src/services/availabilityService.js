import { ApiError } from "../utils/ApiError.js";
import { availabilityRepository } from "../repositories/availabilityRepository.js";
import { listingRepository } from "../repositories/listingRepository.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeReason(raw) {
  if (!raw) return "HOST_BLOCKED";
  const upper = String(raw).toUpperCase().replace(/\s+/g, "_");
  if (["BOOKED", "MAINTENANCE", "HOST_BLOCKED"].includes(upper)) return upper;
  return "HOST_BLOCKED";
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatBlock(b) {
  if (!b) return null;
  const id = String(b._id || b.id);
  const start = b.startDate || b.start;
  const end = b.endDate || b.end;
  return {
    id,
    listingId: String(b.listingId),
    startDate: start,
    endDate: end,
    start,
    end,
    reason: b.reason,
    createdBy: b.createdBy ? String(b.createdBy) : undefined,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export function createAvailabilityService(
  config,
  {
    availabilityRepo = availabilityRepository,
    listingRepo = listingRepository,
  } = {}
) {
  return {
    async getBlocks(listingId) {
      const blocks = await availabilityRepo.findByListing(listingId);
      return blocks.map(formatBlock);
    },

    async addBlock(listingId, hostId, input) {
      const listing = await listingRepo.findById(listingId);
      if (!listing) {
        throw new ApiError(404, "NOT_FOUND", "Listing not found");
      }
      if (String(listing.hostId) !== String(hostId)) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "You can only manage availability for your own listings"
        );
      }

      const startDate = (input.startDate || input.start || "").trim();
      const endDate = (input.endDate || input.end || "").trim();

      if (!DATE_REGEX.test(startDate) || !DATE_REGEX.test(endDate)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "startDate and endDate must be YYYY-MM-DD format"
        );
      }

      if (startDate >= endDate) {
        throw new ApiError(
          400,
          "INVALID_DATE_RANGE",
          "startDate must be strictly before endDate"
        );
      }

      const today = getTodayString();
      if (startDate < today) {
        throw new ApiError(
          400,
          "PAST_DATE_NOT_ALLOWED",
          "Cannot create blocked date ranges in the past"
        );
      }

      const reason = normalizeReason(input.reason);

      const result = await availabilityRepo.createBlockAtomic(listingId, {
        startDate,
        endDate,
        reason,
        createdBy: hostId,
      });

      if (result.overlap) {
        throw new ApiError(
          409,
          "OVERLAPPING_BLOCK",
          "Requested date range overlaps an existing blocked period"
        );
      }

      return formatBlock(result.block);
    },

    async removeBlock(blockId, hostId) {
      const block = await availabilityRepo.findById(blockId);
      if (!block) {
        throw new ApiError(404, "NOT_FOUND", "Blocked date range not found");
      }

      const listing = await listingRepo.findById(block.listingId);
      if (!listing || String(listing.hostId) !== String(hostId)) {
        throw new ApiError(
          403,
          "FORBIDDEN",
          "You can only remove blocked dates for your own listings"
        );
      }

      await availabilityRepo.remove(blockId);
      return { id: blockId };
    },

    async checkAvailability(listingId, checkIn, checkOut) {
      if (!checkIn || !checkOut) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "checkIn and checkOut dates are required"
        );
      }

      const sIn = checkIn.trim();
      const sOut = checkOut.trim();

      if (!DATE_REGEX.test(sIn) || !DATE_REGEX.test(sOut)) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "checkIn and checkOut must be YYYY-MM-DD format"
        );
      }

      if (sIn >= sOut) {
        throw new ApiError(
          400,
          "INVALID_DATE_RANGE",
          "checkIn must be strictly before checkOut"
        );
      }

      const overlap = await availabilityRepo.findOverlapping(
        listingId,
        sIn,
        sOut
      );
      return {
        listingId: String(listingId),
        checkIn: sIn,
        checkOut: sOut,
        available: !overlap,
      };
    },
  };
}
