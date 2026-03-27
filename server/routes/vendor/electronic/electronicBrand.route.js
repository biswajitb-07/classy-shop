import express from "express";
import { addElectronicBrand, deleteElectronicBrand, getBrandsByVendor, updateElectronicBrand } from "../../../controllers/vendor/electronic/electronicBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const electronicBrandRouter = express.Router();

electronicBrandRouter.get(
  "/electronic-brand",
  isAuthenticatedVendor,
  getBrandsByVendor
);
electronicBrandRouter.post(
  "/electronic-brand",
  isAuthenticatedVendor,
  addElectronicBrand
);
electronicBrandRouter.put(
  "/electronic-brand",
  isAuthenticatedVendor,
  updateElectronicBrand
);
electronicBrandRouter.delete(
  "/electronic-brand",
  isAuthenticatedVendor,
  deleteElectronicBrand
);

export default electronicBrandRouter;
