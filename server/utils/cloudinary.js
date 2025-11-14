import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const uploadMedia = async (file) => {
  try {
    if (!file || !file.path || !file.mimetype || !file.size) {
      throw new Error(
        "Invalid file input: Missing file path, mimetype, or size."
      );
    }

    const isImage = file.mimetype.startsWith("image/");
    if (!isImage) {
      throw new Error("Only image files are allowed.");
    }

    const folder = "falcon/image";
    const uploadOptions = {
      resource_type: "image",
      folder: folder,
    };

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(
      file.path,
      uploadOptions
    );

    // Remove file from local storage after successful upload
    fs.unlinkSync(file.path);

    return uploadResponse;
  } catch (error) {
    console.error("Upload Error:", error.message);
    throw error;
  }
};

export const uploadMediaVendor = async (file) => {
  try {
    if (!file || !file.path || !file.mimetype || !file.size) {
      throw new Error(
        "Invalid file input: Missing file path, mimetype, or size."
      );
    }

    const isImage = file.mimetype.startsWith("image/");
    if (!isImage) {
      throw new Error("Only image files are allowed.");
    }

    const folder = "falcon/image/vendor";
    const uploadOptions = {
      resource_type: "image",
      folder: folder,
    };
    const uploadResponse = await cloudinary.uploader.upload(
      file.path,
      uploadOptions
    );

    fs.unlinkSync(file.path);

    return uploadResponse;
  } catch (error) {
    console.error("Upload Error:", error.message);
    throw error;
  }
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Delete Error:", error);
  }
};
