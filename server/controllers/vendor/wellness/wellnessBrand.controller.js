import WellnessBrand from "../../../models/vendor/wellness/wellnessBrand.model.js";

export const getWellnessBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await WellnessBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching wellness brand list:", error);
    res
      .status(500)
      .json({
        message: "Error fetching wellness brand list",
        error: error.message,
      });
  }
};

export const addWellnessBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res
        .status(400)
        .json({ message: "Valid wellness brand name is required." });
    }

    let brandDoc = await WellnessBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await WellnessBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await WellnessBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding wellness brand:", error);
    res
      .status(500)
      .json({ message: "Error adding wellness brand", error: error.message });
  }
};

export const updateWellnessBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Wellness brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({
          message: "At least one valid wellness brand name is required.",
        });
    }

    const updatedBrandDoc = await WellnessBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving wellness brand list:", error);
    res
      .status(500)
      .json({
        message: "Error saving wellness brand list",
        error: error.message,
      });
  }
};

export const deleteWellnessBrand = async (req, res) => {
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
        .json({ message: "Valid wellness brand name is required to remove." });
    }

    const brandDoc = await WellnessBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing wellness brand:", error);
    res
      .status(500)
      .json({ message: "Error removing wellness brand", error: error.message });
  }
};
