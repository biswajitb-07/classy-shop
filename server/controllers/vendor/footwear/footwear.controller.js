import Footwear from "../../../models/vendor/footwear/footwear.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";
import { emitVendorDashboardUpdate } from "../../../socket/socket.js";

export const getFootwearItemsForUser = async (req, res) => {
  try {
    const footwearItems = await Footwear.find().select("-vendorId");
    if (!footwearItems.length) {
      return res.status(200).json({
        success: true,
        footwearItems: [],
        message: "No footwear items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      footwearItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load footwear items",
    });
  }
};

export const getFootwearItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const footwearItems = await Footwear.find({ vendorId }).populate("vendorId");
    if (!footwearItems.length) {
      return res.status(200).json({
        success: true,
        footwearItems: [],
        message: "No footwear items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      footwearItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load footwear items",
    });
  }
};

export const addFootwearItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const {
      name,
      brand,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      sizes,
      rating,
      category,
      subCategory,
      thirdLevelCategory,
    } = req.body;

    if (
      !name ||
      !brand ||
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

    const footwear = await Footwear.create({
      name: name.trim(),
      vendorId,
      brand: brand.trim(),
      image: imageUrls,
      rating: rating || 0,
      originalPrice,
      discountedPrice,
      inStock,
      description: description.trim(),
      sizes: sizes || [],
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      thirdLevelCategory: thirdLevelCategory ? thirdLevelCategory.trim() : "",
    });

    emitVendorDashboardUpdate(vendorId);
    res.status(201).json({ success: true, footwear });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateFootwearItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const footwearId = req.params.id;
    const {
      name,
      brand,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      sizes,
      rating,
      category,
      subCategory,
      thirdLevelCategory,
    } = req.body;
    const uploadedImages = req.files;

    const footwearItem = await Footwear.findOne({ _id: footwearId, vendorId });
    if (!footwearItem) {
      return res.status(404).json({
        success: false,
        message: "Footwear item not found.",
      });
    }

    let imageUrls = footwearItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        footwearItem.image.map(async (url) => {
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
        : footwearItem.rating;

    const updatedFootwearItem = await Footwear.findByIdAndUpdate(
      footwearId,
      {
        name,
        brand,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        sizes: sizes || footwearItem.sizes || [],
        category: category || footwearItem.category,
        subCategory: subCategory || footwearItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || footwearItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      footwearItem: updatedFootwearItem,
      message: "Footwear item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update footwear item.",
    });
  }
};

export const updateFootwearImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const footwearId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const footwearItem = await Footwear.findOne({ _id: footwearId, vendorId });
    if (!footwearItem) {
      return res.status(404).json({
        success: false,
        message: "Footwear item not found.",
      });
    }

    const currentImages = [...footwearItem.image];

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

    footwearItem.image = currentImages;
    await footwearItem.save();

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      footwearItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteFootwearItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const footwearId = req.params.id;

    const footwearItem = await Footwear.findOne({ _id: footwearId, vendorId });
    if (!footwearItem) {
      return res.status(404).json({
        success: false,
        message: "Footwear item not found.",
      });
    }

    await Promise.all(
      footwearItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Footwear.findByIdAndDelete(footwearId);

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Footwear item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete footwear item.",
    });
  }
};
