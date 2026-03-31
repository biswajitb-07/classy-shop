import Jewellery from "../../../models/vendor/jewellery/jewellery.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";
import { emitVendorDashboardUpdate } from "../../../socket/socket.js";

export const getJewelleryItemsForUser = async (req, res) => {
  try {
    const jewelleryItems = await Jewellery.find().select("-vendorId");
    if (!jewelleryItems.length) {
      return res.status(200).json({
        success: true,
        jewelleryItems: [],
        message: "No jewellery items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      jewelleryItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load jewellery items",
    });
  }
};

export const getJewelleryItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const jewelleryItems = await Jewellery.find({ vendorId }).populate("vendorId");
    if (!jewelleryItems.length) {
      return res.status(200).json({
        success: true,
        jewelleryItems: [],
        message: "No jewellery items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      jewelleryItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load jewellery items",
    });
  }
};

export const addJewelleryItem = async (req, res) => {
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

    const jewellery = await Jewellery.create({
      name: name.trim(),
      vendorId,
      image: imageUrls,
      rating: rating || 0,
      baseRating: rating || 0,
      originalPrice,
      discountedPrice,
      inStock,
      description: description.trim(),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      thirdLevelCategory: thirdLevelCategory ? thirdLevelCategory.trim() : "",
    });

    emitVendorDashboardUpdate(vendorId);
    res.status(201).json({ success: true, jewellery });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateJewelleryItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const jewelleryId = req.params.id;
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

    const jewelleryItem = await Jewellery.findOne({ _id: jewelleryId, vendorId });
    if (!jewelleryItem) {
      return res.status(404).json({
        success: false,
        message: "Jewellery item not found.",
      });
    }

    let imageUrls = jewelleryItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        jewelleryItem.image.map(async (url) => {
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
        : jewelleryItem.rating;

    const updatedJewelleryItem = await Jewellery.findByIdAndUpdate(
      jewelleryId,
      {
        name,
        image: imageUrls,
        rating: ratingValue,
        baseRating:
          rating !== undefined ? ratingValue : jewelleryItem.baseRating,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        category: category || jewelleryItem.category,
        subCategory: subCategory || jewelleryItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || jewelleryItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      jewelleryItem: updatedJewelleryItem,
      message: "Jewellery item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update jewellery item.",
    });
  }
};

export const updateJewelleryImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const jewelleryId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const jewelleryItem = await Jewellery.findOne({ _id: jewelleryId, vendorId });
    if (!jewelleryItem) {
      return res.status(404).json({
        success: false,
        message: "Jewellery item not found.",
      });
    }

    const currentImages = [...jewelleryItem.image];

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

    jewelleryItem.image = currentImages;
    await jewelleryItem.save();

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      jewelleryItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteJewelleryItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const jewelleryId = req.params.id;

    const jewelleryItem = await Jewellery.findOne({ _id: jewelleryId, vendorId });
    if (!jewelleryItem) {
      return res.status(404).json({
        success: false,
        message: "Jewellery item not found.",
      });
    }

    await Promise.all(
      jewelleryItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Jewellery.findByIdAndDelete(jewelleryId);

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Jewellery item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete jewellery item.",
    });
  }
};
