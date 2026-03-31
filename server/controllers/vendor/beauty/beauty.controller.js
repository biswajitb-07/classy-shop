import Beauty from "../../../models/vendor/beauty/beauty.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";
import { emitVendorDashboardUpdate } from "../../../socket/socket.js";

export const getBeautyItemsForUser = async (req, res) => {
  try {
    const beautyItems = await Beauty.find().select("-vendorId");
    if (!beautyItems.length) {
      return res.status(200).json({
        success: true,
        beautyItems: [],
        message: "No beauty items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      beautyItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load beauty items",
    });
  }
};

export const getBeautyItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const beautyItems = await Beauty.find({ vendorId }).populate("vendorId");
    if (!beautyItems.length) {
      return res.status(200).json({
        success: true,
        beautyItems: [],
        message: "No beauty items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      beautyItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load beauty items",
    });
  }
};

export const addBeautyItem = async (req, res) => {
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

    const beauty = await Beauty.create({
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
    res.status(201).json({ success: true, beauty });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateBeautyItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const beautyId = req.params.id;
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

    const beautyItem = await Beauty.findOne({ _id: beautyId, vendorId });
    if (!beautyItem) {
      return res.status(404).json({
        success: false,
        message: "Beauty item not found.",
      });
    }

    let imageUrls = beautyItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        beautyItem.image.map(async (url) => {
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
        : beautyItem.rating;

    const updatedBeautyItem = await Beauty.findByIdAndUpdate(
      beautyId,
      {
        name,
        image: imageUrls,
        rating: ratingValue,
        baseRating: rating !== undefined ? ratingValue : beautyItem.baseRating,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        category: category || beautyItem.category,
        subCategory: subCategory || beautyItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || beautyItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      beautyItem: updatedBeautyItem,
      message: "Beauty item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update beauty item.",
    });
  }
};

export const updateBeautyImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const beautyId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const beautyItem = await Beauty.findOne({ _id: beautyId, vendorId });
    if (!beautyItem) {
      return res.status(404).json({
        success: false,
        message: "Beauty item not found.",
      });
    }

    const currentImages = [...beautyItem.image];

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

    beautyItem.image = currentImages;
    await beautyItem.save();

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      beautyItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteBeautyItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const beautyId = req.params.id;

    const beautyItem = await Beauty.findOne({ _id: beautyId, vendorId });
    if (!beautyItem) {
      return res.status(404).json({
        success: false,
        message: "Beauty item not found.",
      });
    }

    await Promise.all(
      beautyItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Beauty.findByIdAndDelete(beautyId);

    emitVendorDashboardUpdate(vendorId);
    return res.status(200).json({
      success: true,
      message: "Beauty item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete beauty item.",
    });
  }
};
