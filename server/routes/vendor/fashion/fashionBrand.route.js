// File guide: fashionBrand.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  getBrandsByVendor,
  addFashionBrand,
  updateFashionBrand,
  deleteFashionBrand,
} from "../../../controllers/vendor/fashion/fashionBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const fashionBrandRouter = express.Router();

fashionBrandRouter.get(
  "/fashion-brand",
  isAuthenticatedVendor,
  getBrandsByVendor
);
fashionBrandRouter.post(
  "/fashion-brand",
  isAuthenticatedVendor,
  addFashionBrand
);
fashionBrandRouter.put(
  "/fashion-brand",
  isAuthenticatedVendor,
  updateFashionBrand
);
fashionBrandRouter.delete(
  "/fashion-brand",
  isAuthenticatedVendor,
  deleteFashionBrand
);

export default fashionBrandRouter;
