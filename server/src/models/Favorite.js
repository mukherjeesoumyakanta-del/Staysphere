import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Unique compound index: a user can only favorite a listing once
favoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const Favorite = mongoose.model("Favorite", favoriteSchema);
