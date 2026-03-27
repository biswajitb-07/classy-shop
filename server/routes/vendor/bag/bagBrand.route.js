// File guide: bagBrand.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  addBagBrand,
  deleteBagBrand,
  getBrandsByVendor,
  updateBagBrand,
} from "../../../controllers/vendor/bag/bagBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const bagBrandRouter = express.Router();

bagBrandRouter.get(
  "/bag-brand",
  isAuthenticatedVendor,
  getBrandsByVendor
);
bagBrandRouter.post(
  "/bag-brand",
  isAuthenticatedVendor,
  addBagBrand
);
bagBrandRouter.put(
  "/bag-brand",
  isAuthenticatedVendor,
  updateBagBrand
);
bagBrandRouter.delete(
  "/bag-brand",
  isAuthenticatedVendor,
  deleteBagBrand
);

export default bagBrandRouter;
