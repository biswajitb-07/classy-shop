import Bag from "../../../models/vendor/bag/bag.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";

export const getBagItemsForUser = async (req, res) => {
  try {
    const bagItems = await Bag.find().select("-vendorId");
    if (!bagItems.length) {
      return res.status(200).json({
        success: true,
        bagItems: [],
        message: "No bag items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      bagItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load bag items",
    });
  }
};

export const getBagItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const bagItems = await Bag.find({ vendorId }).populate("vendorId");
    if (!bagItems.length) {
      return res.status(200).json({
        success: true,
        bagItems: [],
        message: "No bag items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      bagItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load bag items",
    });
  }
};

export const addBagItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const {
      name,
      brand,
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

    // Check if images are provided
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image required." });
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadMediaVendor(file);
        return result.secure_url;
      })
    );

    // Create bag item
    const bag = await Bag.create({
      name: name.trim(),
      vendorId,
      brand: brand.trim(),
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

    res.status(201).json({ success: true, bag });
  } catch (err) {
    console.log(err);

    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateBagItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const bagId = req.params.id;
    const {
      name,
      brand,
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

    const bagItem = await Bag.findOne({ _id: bagId, vendorId });
    if (!bagItem) {
      return res.status(404).json({
        success: false,
        message: "Bag item not found.",
      });
    }

    let imageUrls = bagItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        bagItem.image.map(async (url) => {
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

    // Preserve exact rating value (integer if whole number, float otherwise)
    const ratingValue =
      rating !== undefined
        ? Number.isInteger(Number(rating))
          ? Number(rating)
          : parseFloat(Number(rating).toFixed(1))
        : bagItem.rating;

    const updatedBagItem = await Bag.findByIdAndUpdate(
      bagId,
      {
        name,
        brand,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        category: category || bagItem.category,
        subCategory: subCategory || bagItem.subCategory,
        thirdLevelCategory: thirdLevelCategory || bagItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      bagItem: updatedBagItem,
      message: "Bag item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update bag item.",
    });
  }
};

export const updateBagImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const bagId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const bagItem = await Bag.findOne({ _id: bagId, vendorId });
    if (!bagItem) {
      return res.status(404).json({
        success: false,
        message: "Bag item not found.",
      });
    }

    const currentImages = [...bagItem.image];

    // Handle replacement images
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

    bagItem.image = currentImages;
    await bagItem.save();

    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      bagItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteBagItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const bagId = req.params.id;

    const bagItem = await Bag.findOne({ _id: bagId, vendorId });
    if (!bagItem) {
      return res.status(404).json({
        success: false,
        message: "Bag item not found.",
      });
    }

    await Promise.all(
      bagItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Bag.findByIdAndDelete(bagId);

    return res.status(200).json({
      success: true,
      message: "Bag item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete bag item.",
    });
  }
};
