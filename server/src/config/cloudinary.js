import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "../utils/ApiError.js";

export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  return (
    typeof CLOUDINARY_CLOUD_NAME === "string" &&
    CLOUDINARY_CLOUD_NAME.trim().length > 0 &&
    typeof CLOUDINARY_API_KEY === "string" &&
    CLOUDINARY_API_KEY.trim().length > 0 &&
    typeof CLOUDINARY_API_SECRET === "string" &&
    CLOUDINARY_API_SECRET.trim().length > 0
  );
}

function getConfiguredCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export async function uploadToCloudinary(
  fileBuffer,
  originalName,
  folder = "staysphere/listings"
) {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      "CLOUDINARY_NOT_CONFIGURED",
      "Image uploads are not configured on this server"
    );
  }
  const cl = getConfiguredCloudinary();
  return new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      { folder, public_id: originalName.replace(/\.[^.]+$/, ""), overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
}

export async function deleteFromCloudinary(publicIds) {
  if (!isCloudinaryConfigured() || !publicIds || publicIds.length === 0) {
    return;
  }
  const cl = getConfiguredCloudinary();
  await cl.api.delete_resources(publicIds);
}
