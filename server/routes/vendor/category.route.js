import express from "express";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";
import {
  addCategory,
  addSubCategory,
  addThirdLevelSubCategory,
  getCategories,
  updateCategory,
  updateSubcategory,
  deleteCategory,
  deleteSubCategory,
  deleteThirdLevelSubCategory,
  updateThirdLevelSubCategory,
  getVendorCategories,
} from "../../controllers/vendor/category.controller.js";
import upload from "../../utils/multer.js";

const categoryRouter = express.Router();

categoryRouter.post(
  "/add-category",
  isAuthenticatedVendor,
  upload.single("photo"),
  addCategory
);
categoryRouter.put(
  "/category-update",
  isAuthenticatedVendor,
  upload.single("photo"),
  updateCategory
);
categoryRouter.post("/delete-category", isAuthenticatedVendor, deleteCategory);
categoryRouter.post(
  "/:categoryName/sub",
  isAuthenticatedVendor,
  addSubCategory
);
categoryRouter.put("/sub-update", isAuthenticatedVendor, updateSubcategory);
categoryRouter.post("/sub-delete", isAuthenticatedVendor, deleteSubCategory);
categoryRouter.post(
  "/:categoryName/sub/:subCategoryName/third",
  isAuthenticatedVendor,
  addThirdLevelSubCategory
);
categoryRouter.post(
  "/third-delete",
  isAuthenticatedVendor,
  deleteThirdLevelSubCategory
);
categoryRouter.put(
  "/third-update",
  isAuthenticatedVendor,
  updateThirdLevelSubCategory
);
categoryRouter.get("/", getCategories);
categoryRouter.get("/category", isAuthenticatedVendor, getVendorCategories);

export default categoryRouter;
