import express from "express";
import {
  addBeautyBrand,
  deleteBeautyBrand,
  getBeautyBrandsByVendor,
  updateBeautyBrand,
} from "../../../controllers/vendor/beauty/beautyBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const beautyBrandRouter = express.Router();

beautyBrandRouter.get(
  "/beauty-brand",
  isAuthenticatedVendor,
  getBeautyBrandsByVendor
);
beautyBrandRouter.post("/beauty-brand", isAuthenticatedVendor, addBeautyBrand);
beautyBrandRouter.put(
  "/beauty-brand",
  isAuthenticatedVendor,
  updateBeautyBrand
);
beautyBrandRouter.delete(
  "/beauty-brand",
  isAuthenticatedVendor,
  deleteBeautyBrand
);

export default beautyBrandRouter;
