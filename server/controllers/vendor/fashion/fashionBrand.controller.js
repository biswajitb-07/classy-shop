import FashionBrand from "../../../models/vendor/fashion/fashionBrand.model.js";

export const getBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await FashionBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching brand list:", error);
    res
      .status(500)
      .json({ message: "Error fetching brand list", error: error.message });
  }
};

export const addFashionBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res.status(400).json({ message: "Valid brand name is required." });
    }

    let brandDoc = await FashionBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await FashionBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await FashionBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding brand:", error);
    res
      .status(500)
      .json({ message: "Error adding brand", error: error.message });
  }
};

export const updateFashionBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one valid brand name is required." });
    }

    const updatedBrandDoc = await FashionBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving brand list:", error);
    res
      .status(500)
      .json({ message: "Error saving brand list", error: error.message });
  }
};

export const deleteFashionBrand = async (req, res) => {
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
        .json({ message: "Valid brand name is required to remove." });
    }

    const brandDoc = await FashionBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing brand:", error);
    res
      .status(500)
      .json({ message: "Error removing brand", error: error.message });
  }
};
