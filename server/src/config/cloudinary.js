import { v2 as cloudinary } from "cloudinary";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, "../../uploads");

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
  folder = "staysphere/listings",
  mimetype = "image/jpeg"
) {
  // If Cloudinary credentials are provided, use Cloudinary
  if (isCloudinaryConfigured()) {
    const cl = getConfiguredCloudinary();
    return new Promise((resolve, reject) => {
      const stream = cl.uploader.upload_stream(
        {
          folder,
          public_id: originalName.replace(/\.[^.]+$/, ""),
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(fileBuffer);
    });
  }

  // Graceful local uploads fallback when Cloudinary is not configured
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = path.extname(originalName) || ".jpg";
  const cleanName = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}_${cleanName}${ext}`;
  const filePath = path.join(uploadsDir, filename);

  await fs.promises.writeFile(filePath, fileBuffer);

  return {
    url: `/uploads/${filename}`,
    publicId: `local_${filename}`,
  };
}

export async function deleteFromCloudinary(publicIds) {
  if (!publicIds || publicIds.length === 0) {
    return;
  }

  // Clean up local uploads
  const localIds = publicIds.filter((id) => id.startsWith("local_"));
  for (const id of localIds) {
    const filename = id.replace(/^local_/, "");
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch {}
    }
  }

  // Clean up Cloudinary uploads
  const cloudIds = publicIds.filter((id) => !id.startsWith("local_"));
  if (isCloudinaryConfigured() && cloudIds.length > 0) {
    const cl = getConfiguredCloudinary();
    await cl.api.delete_resources(cloudIds);
  }
}
