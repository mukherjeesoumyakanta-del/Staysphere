import mongoose from "mongoose";
import { User } from "../models/User.js";
mongoose.set("bufferCommands", false);
export async function connectDatabase(config) {
  if (!config.mongoUri)
    throw new Error(
      "MONGO_URI is required; configure it in server/.env or Render",
    );
  if (!config.jwtSecret || config.jwtSecret.length < 32)
    throw new Error("JWT_SECRET must be at least 32 characters");
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
  await User.init(); // Build the unique email index before accepting registrations.
}
export const disconnectDatabase = () => mongoose.disconnect();
