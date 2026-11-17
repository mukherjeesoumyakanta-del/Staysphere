import { BlockedDate } from "../models/BlockedDate.js";

// In-process lock per listingId to serialize overlapping checks and insertions
const listingLocks = new Map();

function withListingLock(listingId, fn) {
  const key = String(listingId);
  const current = listingLocks.get(key) || Promise.resolve();
  let release;
  const next = new Promise((resolve) => {
    release = resolve;
  });
  listingLocks.set(key, current.then(() => next));

  return current.then(async () => {
    try {
      return await fn();
    } finally {
      release();
      if (listingLocks.get(key) === next) {
        listingLocks.delete(key);
      }
    }
  });
}

export const availabilityRepository = {
  async findByListing(listingId) {
    return BlockedDate.find({ listingId }).sort({ startDate: 1 }).lean();
  },

  async findById(blockId) {
    return BlockedDate.findById(blockId).lean();
  },

  /**
   * Interval-Overlap Algorithm:
   * Two half-open date intervals [A_start, A_end) and [B_start, B_end) overlap
   * if and only if (A_start < B_end) AND (A_end > B_start).
   * Backed by compound index: { listingId: 1, startDate: 1, endDate: 1 }.
   */
  async findOverlapping(listingId, startDate, endDate) {
    return BlockedDate.findOne({
      listingId,
      startDate: { $lt: endDate },
      endDate: { $gt: startDate },
    }).lean();
  },

  async createBlockAtomic(listingId, blockData) {
    // Execute inside a per-listing lock to prevent concurrent check-then-insert race conditions
    return withListingLock(listingId, async () => {
      const overlap = await BlockedDate.findOne({
        listingId,
        startDate: { $lt: blockData.endDate },
        endDate: { $gt: blockData.startDate },
      }).lean();

      if (overlap) {
        return { overlap };
      }

      const created = await BlockedDate.create({
        ...blockData,
        listingId,
      });

      return { block: created.toObject ? created.toObject() : created };
    });
  },

  async remove(blockId) {
    return BlockedDate.deleteOne({ _id: blockId });
  },
};
