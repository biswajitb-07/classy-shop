// File guide: groceryBrand.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  addGroceryBrand,
  deleteGroceryBrand,
  getGroceryBrandsByVendor,
  updateGroceryBrand,
} from "../../../controllers/vendor/grocery/groceryBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const groceryBrandRouter = express.Router();

groceryBrandRouter.get(
  "/grocery-brand",
  isAuthenticatedVendor,
  getGroceryBrandsByVendor
);
groceryBrandRouter.post(
  "/grocery-brand",
  isAuthenticatedVendor,
  addGroceryBrand
);
groceryBrandRouter.put(
  "/grocery-brand",
  isAuthenticatedVendor,
  updateGroceryBrand
);
groceryBrandRouter.delete(
  "/grocery-brand",
  isAuthenticatedVendor,
  deleteGroceryBrand
);

export default groceryBrandRouter;
