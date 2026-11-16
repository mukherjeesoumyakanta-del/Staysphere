import multer from "multer";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../config/cloudinary.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      ),
      false
    );
  }
};

export const uploadImages = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter,
}).array("images", 6);

export async function processImages(req, res, next) {
  if (!req.files || req.files.length === 0) {
    req.uploadedImages = [];
    return next();
  }

  const uploaded = [];
  try {
    for (const file of req.files) {
      const result = await uploadToCloudinary(
        file.buffer,
        file.originalname
      );
      uploaded.push(result);
    }
    req.uploadedImages = uploaded;
    next();
  } catch (error) {
    // Roll back any already-uploaded images
    if (uploaded.length > 0) {
      await deleteFromCloudinary(uploaded.map((u) => u.publicId)).catch(
        () => {}
      );
    }
    next(error);
  }
}
