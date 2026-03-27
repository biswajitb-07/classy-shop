import GroceryBrand from "../../../models/vendor/grocery/groceryBrand.model.js";

export const getGroceryBrandsByVendor = async (req, res) => {
  try {
    const vendorId = req.id;
    const brandDoc = await GroceryBrand.findOne({ vendorId });
    if (!brandDoc) {
      return res.status(200).json({ vendorId, brand: [] });
    }
    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error fetching grocery brand list:", error);
    res
      .status(500)
      .json({
        message: "Error fetching grocery brand list",
        error: error.message,
      });
  }
};

export const addGroceryBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { newBrand } = req.body;

    if (!newBrand || typeof newBrand !== "string" || !newBrand.trim()) {
      return res
        .status(400)
        .json({ message: "Valid grocery brand name is required." });
    }

    let brandDoc = await GroceryBrand.findOne({ vendorId });

    if (!brandDoc) {
      brandDoc = await GroceryBrand.create({
        vendorId,
        brand: [newBrand.trim()],
      });
    } else {
      brandDoc = await GroceryBrand.findOneAndUpdate(
        { vendorId },
        { $addToSet: { brand: newBrand.trim() } },
        { new: true, runValidators: true }
      );
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error adding grocery brand:", error);
    res
      .status(500)
      .json({ message: "Error adding grocery brand", error: error.message });
  }
};

export const updateGroceryBrand = async (req, res) => {
  try {
    const vendorId = req.id;
    const { brand } = req.body;

    if (!Array.isArray(brand) || brand.length === 0) {
      return res
        .status(400)
        .json({ message: "Grocery brand must be a non-empty array." });
    }

    const validBrands = brand.map((b) => b.trim()).filter((b) => b);
    if (validBrands.length === 0) {
      return res
        .status(400)
        .json({
          message: "At least one valid grocery brand name is required.",
        });
    }

    const updatedBrandDoc = await GroceryBrand.findOneAndUpdate(
      { vendorId },
      { $set: { brand: validBrands } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(updatedBrandDoc);
  } catch (error) {
    console.error("Error saving grocery brand list:", error);
    res
      .status(500)
      .json({
        message: "Error saving grocery brand list",
        error: error.message,
      });
  }
};

export const deleteGroceryBrand = async (req, res) => {
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
        .json({ message: "Valid grocery brand name is required to remove." });
    }

    const brandDoc = await GroceryBrand.findOneAndUpdate(
      { vendorId },
      { $pull: { brand: brandToRemove.trim() } },
      { new: true }
    );

    if (!brandDoc) {
      return res.status(404).json({ message: "Vendor not found." });
    }

    res.status(200).json(brandDoc);
  } catch (error) {
    console.error("Error removing grocery brand:", error);
    res
      .status(500)
      .json({ message: "Error removing grocery brand", error: error.message });
  }
};
