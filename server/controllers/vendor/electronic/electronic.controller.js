import Electronic from "../../../models/vendor/electronic/electronic.model.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../../utils/cloudinary.js";

export const getElectronicItemsForUser = async (req, res) => {
  try {
    const electronicItems = await Electronic.find().select("-vendorId");
    if (!electronicItems.length) {
      return res.status(200).json({
        success: true,
        electronicItems: [],
        message: "No electronic items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      electronicItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load electronic items",
    });
  }
};

export const getElectronicItems = async (req, res) => {
  try {
    const vendorId = req.id;
    const electronicItems = await Electronic.find({ vendorId }).populate(
      "vendorId"
    );
    if (!electronicItems.length) {
      return res.status(200).json({
        success: true,
        electronicItems: [],
        message: "No electronic items found for this vendor.",
      });
    }
    return res.status(200).json({
      success: true,
      electronicItems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load electronic items",
    });
  }
};

export const addElectronicItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const {
      name,
      brand,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      rams,
      storage,
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

    let ramArray = [];
    if (Array.isArray(rams)) {
      ramArray = rams;
    } else if (rams) {
      ramArray = rams.split(",").map((r) => r.trim());
    }

    let storageArray = [];
    if (Array.isArray(storage)) {
      storageArray = storage;
    } else if (storage) {
      storageArray = storage.split(",").map((s) => s.trim());
    }

    const imageUrls = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadMediaVendor(file);
        return result.secure_url;
      })
    );

    const electronic = await Electronic.create({
      name: name.trim(),
      vendorId,
      brand: brand.trim(),
      image: imageUrls,
      rating: rating || 0,
      originalPrice,
      discountedPrice,
      inStock,
      description: description.trim(),
      rams: ramArray.filter(
        (r) =>
          r && ["4gb", "6gb", "8gb", "12gb", "16gb"].includes(r.toLowerCase())
      ),
      storage: storageArray.filter(
        (s) =>
          s &&
          ["32gb", "64gb", "128gb", "256gb", "512gb"].includes(s.toLowerCase())
      ),
      category: category.trim(),
      subCategory: subCategory ? subCategory.trim() : "",
      thirdLevelCategory: thirdLevelCategory ? thirdLevelCategory.trim() : "",
    });

    res.status(201).json({ success: true, electronic });
  } catch (err) {
    console.log(err);

    res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

export const updateElectronicItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const electronicId = req.params.id;
    const {
      name,
      brand,
      originalPrice,
      discountedPrice,
      inStock,
      description,
      rams,
      storage,
      rating,
      category,
      subCategory,
      thirdLevelCategory,
    } = req.body;
    const uploadedImages = req.files;

    const electronicItem = await Electronic.findOne({
      _id: electronicId,
      vendorId,
    });
    if (!electronicItem) {
      return res.status(404).json({
        success: false,
        message: "Electronic item not found.",
      });
    }

    let imageUrls = electronicItem.image;
    if (uploadedImages && uploadedImages.length > 0) {
      await Promise.all(
        electronicItem.image.map(async (url) => {
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

    const validRams = Array.isArray(rams)
      ? rams.filter((ram) =>
          ["4gb", "6gb", "8gb", "12gb", "16gb"].includes(ram.toLowerCase())
        )
      : [];

    const validStorage = Array.isArray(storage)
      ? storage.filter((stor) =>
          ["32gb", "64gb", "128gb", "256gb", "512gb"].includes(
            stor.toLowerCase()
          )
        )
      : [];

    const ratingValue =
      rating !== undefined
        ? Number.isInteger(Number(rating))
          ? Number(rating)
          : parseFloat(Number(rating).toFixed(1))
        : electronicItem.rating;

    const updatedElectronicItem = await Electronic.findByIdAndUpdate(
      electronicId,
      {
        name,
        brand,
        image: imageUrls,
        rating: ratingValue,
        originalPrice,
        discountedPrice,
        inStock,
        description,
        rams: validRams.length > 0 ? validRams : electronicItem.rams,
        storage:
          validStorage.length > 0 ? validStorage : electronicItem.storage,
        category: category || electronicItem.category,
        subCategory: subCategory || electronicItem.subCategory,
        thirdLevelCategory:
          thirdLevelCategory || electronicItem.thirdLevelCategory,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      electronicItem: updatedElectronicItem,
      message: "Electronic item updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update electronic item.",
    });
  }
};

export const updateElectronicImagesByIndex = async (req, res) => {
  try {
    const vendorId = req.id;
    const electronicId = req.params.id;
    const updateMap = JSON.parse(req.body.updateMap || "{}");
    const replaceFiles = req.files?.replaceFiles || [];
    const newFiles = req.files?.newFiles || [];

    const electronicItem = await Electronic.findOne({
      _id: electronicId,
      vendorId,
    });
    if (!electronicItem) {
      return res.status(404).json({
        success: false,
        message: "Electronic item not found.",
      });
    }

    const currentImages = [...electronicItem.image];

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

    electronicItem.image = currentImages;
    await electronicItem.save();

    return res.status(200).json({
      success: true,
      message: "Images updated successfully.",
      electronicItem,
    });
  } catch (error) {
    console.error("Update image error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error while updating images.",
    });
  }
};

export const deleteElectronicItem = async (req, res) => {
  try {
    const vendorId = req.id;
    const electronicId = req.params.id;

    const electronicItem = await Electronic.findOne({
      _id: electronicId,
      vendorId,
    });
    if (!electronicItem) {
      return res.status(404).json({
        success: false,
        message: "Electronic item not found.",
      });
    }

    await Promise.all(
      electronicItem.image.map(async (url) => {
        const urlParts = url.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      })
    );

    await Electronic.findByIdAndDelete(electronicId);

    return res.status(200).json({
      success: true,
      message: "Electronic item deleted successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete electronic item.",
    });
  }
};
