import { Category } from "../../models/vendor/category.model.js";
import {
  uploadMedia,
  deleteMediaFromCloudinary,
} from "../../utils/cloudinary.js";

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const vendorId = req.id;
    const categoryPhoto = req.file;

    if (!categoryPhoto) {
      return res.status(400).json({
        success: false,
        message: "Please upload category Photo",
      });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size exceeds the 10MB limit.",
      });
    }

    const cloudResponse = await uploadMedia(req.file);
    if (!cloudResponse || !cloudResponse.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload profile photo.",
      });
    }

    let image = cloudResponse.secure_url;

    const vendorCategoryDoc = await Category.findOneAndUpdate(
      { vendorId },
      {
        $push: {
          categories: {
            name,
            image,
            subCategories: [],
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json(vendorCategoryDoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    const vendorId = req.id;
    const newPhoto = req.file;

    if (!oldName || !newName) {
      return res.status(400).json({
        success: false,
        message: "Failed to update",
      });
    }

    const vendorCategoryDoc = await Category.findOne({ vendorId });
    if (!vendorCategoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Vendor category document not found.",
      });
    }

    const categoryToUpdate = vendorCategoryDoc.categories.find(
      (cat) => cat.name === oldName
    );

    if (!categoryToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    let updatedImageUrl = categoryToUpdate.image;

    if (newPhoto) {
      if (newPhoto.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the 10MB limit.",
        });
      }

      if (categoryToUpdate.image) {
        const urlParts = categoryToUpdate.image.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      }

      const cloudResponse = await uploadMedia(newPhoto);
      if (!cloudResponse?.secure_url) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload new category image.",
        });
      }

      updatedImageUrl = cloudResponse.secure_url;
    }

    const updatedDoc = await Category.findOneAndUpdate(
      { vendorId, "categories.name": oldName },
      {
        $set: {
          "categories.$.name": newName,
          "categories.$.image": updatedImageUrl,
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: updatedDoc,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update category.",
    });
  }
};

export const addSubCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { name } = req.body;

    const updatedDoc = await Category.findOneAndUpdate(
      { vendorId: req.id, "categories.name": categoryName },
      {
        $push: {
          "categories.$.subCategories": {
            name,
            thirdLevelSubCategories: [],
          },
        },
      },
      { new: true }
    );

    res.status(201).json(updatedDoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateSubcategory = async (req, res) => {
  try {
    const vendorId = req.id;
    const { categoryName, oldSubcategoryName, newSubcategoryName } = req.body;

    if (!categoryName || !oldSubcategoryName || !newSubcategoryName) {
      return res.status(400).json({
        success: false,
        message: "Failed to update",
      });
    }

    const categoryDoc = await Category.findOne({ vendorId });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Vendor category document not found.",
      });
    }

    const category = categoryDoc.categories.find(
      (cat) => cat.name === categoryName
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const subcategory = category.subCategories.find(
      (sub) => sub.name === oldSubcategoryName
    );
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }
    subcategory.name = newSubcategoryName;

    await categoryDoc.save();

    return res.status(200).json({
      success: true,
      message: "Subcategory updated successfully.",
      updatedSubcategory: subcategory,
    });
  } catch (err) {
    console.error("Update subcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update subcategory.",
    });
  }
};

export const addThirdLevelSubCategory = async (req, res) => {
  try {
    const { categoryName, subCategoryName } = req.params;
    const { name } = req.body;

    const updatedDoc = await Category.findOneAndUpdate(
      {
        vendorId: req.id,
        "categories.name": categoryName,
        "categories.subCategories.name": subCategoryName,
      },
      {
        $push: {
          "categories.$[cat].subCategories.$[sub].thirdLevelSubCategories": {
            name,
          },
        },
      },
      {
        arrayFilters: [
          { "cat.name": categoryName },
          { "sub.name": subCategoryName },
        ],
        new: true,
      }
    );

    res.status(201).json(updatedDoc);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateThirdLevelSubCategory = async (req, res) => {
  try {
    const vendorId = req.id;
    const {
      categoryName,
      subCategoryName,
      oldThirdLevelName,
      newThirdLevelName,
    } = req.body;

    if (
      !categoryName ||
      !subCategoryName ||
      !oldThirdLevelName ||
      !newThirdLevelName
    ) {
      return res.status(400).json({
        success: false,
        message: "Failed to update",
      });
    }

    const categoryDoc = await Category.findOne({ vendorId });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Vendor category document not found.",
      });
    }

    const category = categoryDoc.categories.find(
      (cat) => cat.name === categoryName
    );
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    const subcategory = category.subCategories.find(
      (sub) => sub.name === subCategoryName
    );
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found.",
      });
    }

    const thirdLevel = subcategory.thirdLevelSubCategories.find(
      (third) => third.name === oldThirdLevelName
    );
    if (!thirdLevel) {
      return res.status(404).json({
        success: false,
        message: "Third-level category not found.",
      });
    }

    thirdLevel.name = newThirdLevelName;

    await categoryDoc.save();

    return res.status(200).json({
      success: true,
      message: "Third-level category updated successfully.",
      updatedThirdLevel: thirdLevel,
    });
  } catch (err) {
    console.error("Update third-level category error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update third-level category.",
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const vendorId = req.id;

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });
    }

    const categoryDoc = await Category.findOne({ vendorId });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Vendor category document not found.",
      });
    }

    const categoryToDelete = categoryDoc.categories.find(
      (cat) => cat.name === categoryName
    );

    if (!categoryToDelete) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    if (categoryToDelete.image) {
      const urlParts = categoryToDelete.image.split("/");
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split(".")[0];
      await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
    }

    const updatedDoc = await Category.findOneAndUpdate(
      { vendorId },
      {
        $pull: {
          categories: { name: categoryName },
        },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully.",
      data: updatedDoc,
    });
  } catch (err) {
    console.error("Delete category error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category.",
    });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { categoryName, subCategoryName } = req.body;
    const vendorId = req.id;

    if (!categoryName || !subCategoryName) {
      return res.status(400).json({
        success: false,
        message: "Category name and subcategory name are required.",
      });
    }

    const updatedDoc = await Category.findOneAndUpdate(
      { vendorId, "categories.name": categoryName },
      {
        $pull: {
          "categories.$.subCategories": { name: subCategoryName },
        },
      },
      { new: true }
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Category or subcategory not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subcategory deleted successfully.",
      data: updatedDoc,
    });
  } catch (err) {
    console.error("Delete subcategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete subcategory.",
    });
  }
};

export const deleteThirdLevelSubCategory = async (req, res) => {
  try {
    const { categoryName, subCategoryName, thirdLevelName } = req.body;
    const vendorId = req.id;

    if (!categoryName || !subCategoryName || !thirdLevelName) {
      return res.status(400).json({
        success: false,
        message:
          "Category, subcategory, and third-level category names are required.",
      });
    }

    const updatedDoc = await Category.findOneAndUpdate(
      {
        vendorId,
        "categories.name": categoryName,
        "categories.subCategories.name": subCategoryName,
      },
      {
        $pull: {
          "categories.$[cat].subCategories.$[sub].thirdLevelSubCategories": {
            name: thirdLevelName,
          },
        },
      },
      {
        arrayFilters: [
          { "cat.name": categoryName },
          { "sub.name": subCategoryName },
        ],
        new: true,
      }
    );

    if (!updatedDoc) {
      return res.status(404).json({
        success: false,
        message: "Category, subcategory, or third-level category not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Third-level category deleted successfully.",
      data: updatedDoc,
    });
  } catch (err) {
    console.error("Delete third-level category error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete third-level category.",
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories) {
      return res.status(404).json({ message: "No categories found" });
    }
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getVendorCategories = async (req, res) => {
  try {
    const vendorId = req.id;
    const categories = await Category.findOne({ vendorId });
    if (!categories) {
      return res.status(404).json({ message: "No categories found" });
    }
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
