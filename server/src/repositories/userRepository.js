import mongoose from "mongoose";
import { User } from "../models/User.js";
export const userRepository = {
  findByEmail: (email) =>
    User.findOne({ email }).select("+passwordHash").lean(),
  findById: (id) =>
    mongoose.isObjectIdOrHexString(id) ? User.findById(id).lean() : null,
  create: async (values) => (await User.create(values)).toObject(),
  updateProfile: (id, values) =>
    User.findByIdAndUpdate(
      id,
      { $set: values },
      { new: true, runValidators: true },
    ).lean(),
};
