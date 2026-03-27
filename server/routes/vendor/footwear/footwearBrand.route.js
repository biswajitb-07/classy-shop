// File guide: footwearBrand.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  addFootwearBrand,
  deleteFootwearBrand,
  getFootwearBrandsByVendor,
  updateFootwearBrand,
} from "../../../controllers/vendor/footwear/footwearBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const footwearBrandRouter = express.Router();

footwearBrandRouter.get(
  "/footwear-brand",
  isAuthenticatedVendor,
  getFootwearBrandsByVendor
);
footwearBrandRouter.post(
  "/footwear-brand",
  isAuthenticatedVendor,
  addFootwearBrand
);
footwearBrandRouter.put(
  "/footwear-brand",
  isAuthenticatedVendor,
  updateFootwearBrand
);
footwearBrandRouter.delete(
  "/footwear-brand",
  isAuthenticatedVendor,
  deleteFootwearBrand
);

export default footwearBrandRouter;
