import Grocery from "../../../models/vendor/grocery/grocery.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";

export const getGroceryItemsForUser = async (req, res) => {
  try {
    const groceryItems = await Grocery.find().select("-vendorId");
    if (!groceryItems.length) {
      return res.status(200).json({
        success: true,
        groceryItems: [],
        message: "No grocery items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      groceryItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load grocery items",
    });
  }
};

export const getGroceryItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const groceryItems = await Grocery.find({ vendorId }).populate("vendorId");
    if (!groceryItems.length) {
      return res.status(200).json({
        success: true,
        groceryItems: [],
        message: "No grocery items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      groceryItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load grocery items",
    });
  }
};

export const addGroceryItem = async (req, res) => {
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

    const grocery = await Grocery.create({
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

    res.status(201).json({ success: true, grocery });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateGroceryItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const groceryId = req.params.id;
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

    const groceryItem = await Grocery.findOne({ _id: groceryId, vendorId });
    if (!groceryItem) {
      return res.status(404).json({
        success: false,
        message: "Grocery item not found.",
      });
    }

    let imageUrls = groceryItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        groceryItem.image.map(async (url) => {
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
        : groceryItem.rating;

    const updatedGroceryItem = await Grocery.findByIdAndUpdate(
      groceryId,
      {
        name,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        category: category || groceryItem.category,
        subCategory: subCategory || groceryItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || groceryItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      groceryItem: updatedGroceryItem,
      message: "Grocery item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update grocery item.",
    });
  }
};

export const updateGroceryImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const groceryId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const groceryItem = await Grocery.findOne({ _id: groceryId, vendorId });
    if (!groceryItem) {
      return res.status(404).json({
        success: false,
        message: "Grocery item not found.",
      });
    }

    const currentImages = [...groceryItem.image];

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

    groceryItem.image = currentImages;
    await groceryItem.save();

    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      groceryItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteGroceryItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const groceryId = req.params.id;

    const groceryItem = await Grocery.findOne({ _id: groceryId, vendorId });
    if (!groceryItem) {
      return res.status(404).json({
        success: false,
        message: "Grocery item not found.",
      });
    }

    await Promise.all(
      groceryItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Grocery.findByIdAndDelete(groceryId);

    return res.status(200).json({
      success: true,
      message: "Grocery item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete grocery item.",
    });
  }
};
