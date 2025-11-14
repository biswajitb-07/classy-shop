import FootwearBrand from "../../../models/vendor/footwear/footwearBrand.model.js";

export const getFootwearBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await FootwearBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching footwear brand list:", error);
    res
      .status(500)
      .json({
        message: "Error fetching footwear brand list",
        error: error.message,
      });
  }
};

export const addFootwearBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res
        .status(400)
        .json({ message: "Valid footwear brand name is required." });
    }

    let brandDoc = await FootwearBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await FootwearBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await FootwearBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding footwear brand:", error);
    res
      .status(500)
      .json({ message: "Error adding footwear brand", error: error.message });
  }
};

export const updateFootwearBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Footwear brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({
          message: "At least one valid footwear brand name is required.",
        });
    }

    const updatedBrandDoc = await FootwearBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving footwear brand list:", error);
    res
      .status(500)
      .json({
        message: "Error saving footwear brand list",
        error: error.message,
      });
  }
};

export const deleteFootwearBrand = async (req, res) => {
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
        .json({ message: "Valid footwear brand name is required to remove." });
    }

    const brandDoc = await FootwearBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing footwear brand:", error);
    res
      .status(500)
      .json({ message: "Error removing footwear brand", error: error.message });
  }
};
