// File guide: wellnessBrand.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  addWellnessBrand,
  deleteWellnessBrand,
  getWellnessBrandsByVendor,
  updateWellnessBrand,
} from "../../../controllers/vendor/wellness/wellnessBrand.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";

const wellnessBrandRouter = express.Router();

wellnessBrandRouter.get(
  "/wellness-brand",
  isAuthenticatedVendor,
  getWellnessBrandsByVendor
);
wellnessBrandRouter.post(
  "/wellness-brand",
  isAuthenticatedVendor,
  addWellnessBrand
);
wellnessBrandRouter.put(
  "/wellness-brand",
  isAuthenticatedVendor,
  updateWellnessBrand
);
wellnessBrandRouter.delete(
  "/wellness-brand",
  isAuthenticatedVendor,
  deleteWellnessBrand
);

export default wellnessBrandRouter;
