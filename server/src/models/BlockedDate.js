import mongoose from "mongoose";

const blockedDateSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    startDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    endDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    reason: {
      type: String,
      enum: ["BOOKED", "MAINTENANCE", "HOST_BLOCKED"],
      default: "HOST_BLOCKED",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        ret.start = ret.startDate;
        ret.end = ret.endDate;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for fast interval overlap searches
blockedDateSchema.index({ listingId: 1, startDate: 1, endDate: 1 });

export const BlockedDate = mongoose.model("BlockedDate", blockedDateSchema);
