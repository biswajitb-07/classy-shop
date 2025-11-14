import Fashion from "../../../models/vendor/fashion/fashion.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";

export const getFashionItemsForUser = async (req, res) => {
  try {
    const fashionItems = await Fashion.find().select("-vendorId");
    if (!fashionItems.length) {
      return res.status(200).json({
        success: true,
        fashionItems: [],
        message: "No fashion items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      fashionItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load fashion items",
    });
  }
};

export const getFashionItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const fashionItems = await Fashion.find({ vendorId }).populate("vendorId");
    if (!fashionItems.length) {
      return res.status(200).json({
        success: true,
        fashionItems: [],
        message: "No fashion items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      fashionItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load fashion items",
    });
  }
};

export const addFashionItem = async (req, res) => {
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

    // Check if images are provided
    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one image required." });
    }

    // Handle sizes (multer might send as string or array)
    let sizeArray = [];
    if (Array.isArray(sizes)) {
      sizeArray = sizes;
    } else if (sizes) {
      sizeArray = sizes.split(",").map((s) => s.trim());
    }

    // Upload images to Cloudinary
    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadMediaVendor(file);
        return result.secure_url;
      })
    );

    // Create fashion item
    const fashion = await Fashion.create({
      name: name.trim(),
      vendorId,
      brand: brand.trim(),
      image: imageUrls,
      rating: rating || 0,
      originalPrice,
      discountedPrice,
      inStock,
      description: description.trim(),
      sizes: sizeArray.filter(
        (s) => s && ["S", "M", "L", "XL", "XXL"].includes(s.toUpperCase())
      ),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      thirdLevelCategory: thirdLevelCategory ? thirdLevelCategory.trim() : "",
    });

    res.status(201).json({ success: true, fashion });
  } catch (err) {
    console.log(err);

    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateFashionItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const fashionId = req.params.id;
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

    const fashionItem = await Fashion.findOne({ _id: fashionId, vendorId });
    if (!fashionItem) {
      return res.status(404).json({
        success: false,
        message: "Fashion item not found.",
      });
    }

    let imageUrls = fashionItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        fashionItem.image.map(async (url) => {
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

    const validSizes = Array.isArray(sizes)
      ? sizes.filter((size) =>
          ["S", "M", "L", "XL", "XXL"].includes(size.toUpperCase())
        )
      : [];

    // Preserve exact rating value (integer if whole number, float otherwise)
    const ratingValue =
      rating !== undefined
        ? Number.isInteger(Number(rating))
          ? Number(rating)
          : parseFloat(Number(rating).toFixed(1))
        : fashionItem.rating;

    const updatedFashionItem = await Fashion.findByIdAndUpdate(
      fashionId,
      {
        name,
        brand,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        sizes: validSizes.length > 0 ? validSizes : fashionItem.sizes,
        category: category || fashionItem.category,
        subCategory: subCategory || fashionItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || fashionItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      fashionItem: updatedFashionItem,
      message: "Fashion item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update fashion item.",
    });
  }
};

export const updateFashionImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const fashionId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const fashionItem = await Fashion.findOne({ _id: fashionId, vendorId });
    if (!fashionItem) {
      return res.status(404).json({
        success: false,
        message: "Fashion item not found.",
      });
    }

    const currentImages = [...fashionItem.image];

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

    fashionItem.image = currentImages;
    await fashionItem.save();

    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      fashionItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteFashionItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const fashionId = req.params.id;

    const fashionItem = await Fashion.findOne({ _id: fashionId, vendorId });
    if (!fashionItem) {
      return res.status(404).json({
        success: false,
        message: "Fashion item not found.",
      });
    }

    await Promise.all(
      fashionItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Fashion.findByIdAndDelete(fashionId);

    return res.status(200).json({
      success: true,
      message: "Fashion item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete fashion item.",
    });
  }
};
