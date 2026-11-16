import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Listing } from "../models/Listing.js";
import { Booking } from "../models/Booking.js";
import { BlockedDate } from "../models/BlockedDate.js";
import { Favorite } from "../models/Favorite.js";

mongoose.set("bufferCommands", false);

export async function connectDatabase(config) {
  if (!config.mongoUri) {
    throw new Error(
      "MONGO_URI is required; configure it in server/.env or Render"
    );
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  // Connection pooling and timeout settings for production scalability & low latency
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 25,
    minPoolSize: 2,
    socketTimeoutMS: 20000,
  });

  // Ensure all model indexes build before accepting traffic
  await Promise.all([
    User.init(),
    Listing.init(),
    Booking.init(),
    BlockedDate.init(),
    Favorite.init(),
  ]);
}

export const disconnectDatabase = () => mongoose.disconnect();
