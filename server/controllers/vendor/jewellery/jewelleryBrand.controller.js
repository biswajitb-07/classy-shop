import JewelleryBrand from "../../../models/vendor/jewellery/jewelleryBrand.model.js";

export const getJewelleryBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await JewelleryBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching jewellery brand list:", error);
    res
      .status(500)
      .json({
        message: "Error fetching jewellery brand list",
        error: error.message,
      });
  }
};

export const addJewelleryBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res
        .status(400)
        .json({ message: "Valid jewellery brand name is required." });
    }

    let brandDoc = await JewelleryBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await JewelleryBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await JewelleryBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding jewellery brand:", error);
    res
      .status(500)
      .json({ message: "Error adding jewellery brand", error: error.message });
  }
};

export const updateJewelleryBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Jewellery brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({
          message: "At least one valid jewellery brand name is required.",
        });
    }

    const updatedBrandDoc = await JewelleryBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving jewellery brand list:", error);
    res
      .status(500)
      .json({
        message: "Error saving jewellery brand list",
        error: error.message,
      });
  }
};

export const deleteJewelleryBrand = async (req, res) => {
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
        .json({ message: "Valid jewellery brand name is required to remove." });
    }

    const brandDoc = await JewelleryBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing jewellery brand:", error);
    res
      .status(500)
      .json({
        message: "Error removing jewellery brand",
        error: error.message,
      });
  }
};
