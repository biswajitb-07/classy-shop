// File guide: category.model source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import mongoose from "mongoose";

const thirdLevelSubCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    thirdLevelSubCategories: [thirdLevelSubCategorySchema]
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    image: { type: String, required: true, trim: true },
    subCategories: [subCategorySchema]
  },
  { _id: false }
);

export const vendorCategorySchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },
    categories: [categorySchema]
  },
  {
    timestamps: true
  }
);

export const Category = mongoose.model("Category", vendorCategorySchema);
