import BeautyBrand from "../../../models/vendor/beauty/beautyBrand.model.js";

export const getBeautyBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await BeautyBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching beauty brand list:", error);
    res
      .status(500)
      .json({
        message: "Error fetching beauty brand list",
        error: error.message,
      });
  }
};

export const addBeautyBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res
        .status(400)
        .json({ message: "Valid beauty brand name is required." });
    }

    let brandDoc = await BeautyBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await BeautyBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await BeautyBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding beauty brand:", error);
    res
      .status(500)
      .json({ message: "Error adding beauty brand", error: error.message });
  }
};

export const updateBeautyBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Beauty brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one valid beauty brand name is required." });
    }

    const updatedBrandDoc = await BeautyBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving beauty brand list:", error);
    res
      .status(500)
      .json({
        message: "Error saving beauty brand list",
        error: error.message,
      });
  }
};

export const deleteBeautyBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brandToRemove } = req.body;

    if (
      !brandToRemove ||
      typeof brandToRemove !== "string" ||
      !brandToRemove.trim()
    ) {
      return res
        .status(400)
        .json({ message: "Valid beauty brand name is required to remove." });
    }

    const brandDoc = await BeautyBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing beauty brand:", error);
    res
      .status(500)
      .json({ message: "Error removing beauty brand", error: error.message });
  }
};
