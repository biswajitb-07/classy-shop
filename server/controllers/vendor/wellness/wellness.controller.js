import Wellness from "../../../models/vendor/wellness/wellness.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";
import { emitVendorDashboardUpdate } from "../../../socket/socket.js";

export const getWellnessItemsForUser = async (req, res) => {
  try {
    const wellnessItems = await Wellness.find().select("-vendorId");
    if (!wellnessItems.length) {
      return res.status(200).json({
        success: true,
        wellnessItems: [],
        message: "No wellness items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      wellnessItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load wellness items",
    });
  }
};

export const getWellnessItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const wellnessItems = await Wellness.find({ vendorId }).populate("vendorId");
    if (!wellnessItems.length) {
      return res.status(200).json({
        success: true,
        wellnessItems: [],
        message: "No wellness items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      wellnessItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load wellness items",
    });
  }
};

export const addWellnessItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const {
      name,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      rating,
      category,
      subCategory,
      thirdLevelCategory,
    } = req.body;

    if (
      !name ||
      !originalPrice ||
      !discountedPrice ||
      !inStock ||
      !description ||
      !category
    ) {
      return res
        .status(400)
        .json({ success: false, message: "All required fields missing." });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image required." });
    }

    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadMediaVendor(file);
        return result.secure_url;
      })
    );

    const wellness = await Wellness.create({
      name: name.trim(),
      vendorId,
      image: imageUrls,
      rating: rating || 0,
      originalPrice,
      discountedPrice,
      inStock,
      description: description.trim(),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      thirdLevelCategory: thirdLevelCategory ? thirdLevelCategory.trim() : "",
    });

    emitVendorDashboardUpdate(vendorId);
    res.status(201).json({ success: true, wellness });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateWellnessItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const wellnessId = req.params.id;
    const {
      name,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      rating,
      category,
      subCategory,
      thirdLevelCategory,
    } = req.body;
    const uploadedImages = req.files;

    const wellnessItem = await Wellness.findOne({ _id: wellnessId, vendorId });
    if (!wellnessItem) {
      return res.status(404).json({
        success: false,
        message: "Wellness item not found.",
      });
    }

    let imageUrls = wellnessItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        wellnessItem.image.map(async (url) => {
          const urlParts = url.split("/");
          const filename = urlParts[urlParts.length - 1];
          const publicId = filename.split(".")[0];
          await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
        })
      );
      imageUrls = await Promise.all(
        uploadedImages.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) {
            throw new Error("File size exceeds the 10MB limit.");
          }
          const cloudResponse = await uploadMediaVendor(file);
          if (!cloudResponse || !cloudResponse.secure_url) {
            throw new Error("Failed to upload image.");
          }
          return cloudResponse.secure_url;
        })
      );
    }

    const ratingValue =
      rating !== undefined
        ? Number.isInteger(Number(rating))
          ? Number(rating)
          : parseFloat(Number(rating).toFixed(1))
        : wellnessItem.rating;

    const updatedWellnessItem = await Wellness.findByIdAndUpdate(
      wellnessId,
      {
        name,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        category: category || wellnessItem.category,
        subCategory: subCategory || wellnessItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || wellnessItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      wellnessItem: updatedWellnessItem,
      message: "Wellness item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update wellness item.",
    });
  }
};

export const updateWellnessImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const wellnessId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const wellnessItem = await Wellness.findOne({ _id: wellnessId, vendorId });
    if (!wellnessItem) {
      return res.status(404).json({
        success: false,
        message: "Wellness item not found.",
      });
    }

    const currentImages = [...wellnessItem.image];

    if (replaceFiles.length > 0) {
      await Promise.all(
        Object.keys(updateMap).map(async (idxStr) => {
          const idx = parseInt(idxStr, 10);
          if (currentImages[idx]) {
            const urlParts = currentImages[idx].split("/");
            const filename = urlParts[urlParts.length - 1];
            const publicId = filename.split(".")[0];
            await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
          }
        })
      );

      const replaceUrls = await Promise.all(
        replaceFiles.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) {
            throw new Error("File size exceeds the 10MB limit.");
          }
          const cloudResponse = await uploadMediaVendor(file);
          if (!cloudResponse || !cloudResponse.secure_url) {
            throw new Error("Failed to upload image.");
          }
          return cloudResponse.secure_url;
        })
      );

      Object.keys(updateMap).forEach((idxStr, i) => {
        const idx = parseInt(idxStr, 10);
        if (i < replaceUrls.length && currentImages[idx]) {
          currentImages[idx] = replaceUrls[i];
        }
      });
    }

    if (newFiles.length > 0) {
      const newUrls = await Promise.all(
        newFiles.map(async (file) => {
          if (file.size > 10 * 1024 * 1024) {
            throw new Error("File size exceeds the 10MB limit.");
          }
          const cloudResponse = await uploadMediaVendor(file);
          if (!cloudResponse || !cloudResponse.secure_url) {
            throw new Error("Failed to upload image.");
          }
          return cloudResponse.secure_url;
        })
      );
      currentImages.push(...newUrls);
    }

    wellnessItem.image = currentImages;
    await wellnessItem.save();

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      wellnessItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteWellnessItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const wellnessId = req.params.id;

    const wellnessItem = await Wellness.findOne({ _id: wellnessId, vendorId });
    if (!wellnessItem) {
      return res.status(404).json({
        success: false,
        message: "Wellness item not found.",
      });
    }

    await Promise.all(
      wellnessItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Wellness.findByIdAndDelete(wellnessId);

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Wellness item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete wellness item.",
    });
  }
};
