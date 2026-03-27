import express from "express";
import {
  addJewelleryBrand,
  deleteJewelleryBrand,
  getJewelleryBrandsByVendor,
  updateJewelleryBrand,
} from "../../../controllers/vendor/jewellery/jewelleryBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const jewelleryBrandRouter = express.Router();

jewelleryBrandRouter.get(
  "/jewellery-brand",
  isAuthenticatedVendor,
  getJewelleryBrandsByVendor
);
jewelleryBrandRouter.post(
  "/jewellery-brand",
  isAuthenticatedVendor,
  addJewelleryBrand
);
jewelleryBrandRouter.put(
  "/jewellery-brand",
  isAuthenticatedVendor,
  updateJewelleryBrand
);
jewelleryBrandRouter.delete(
  "/jewellery-brand",
  isAuthenticatedVendor,
  deleteJewelleryBrand
);

export default jewelleryBrandRouter;
