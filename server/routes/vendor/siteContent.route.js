import express from "express";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../utils/multer.js";
import {
  addSiteContentItem,
  deleteSiteContentItem,
  getAdminSiteContent,
  updateSiteContentItem,
} from "../../controllers/siteContent.controller.js";

const siteContentVendorRouter = express.Router();

siteContentVendorRouter.get("/", isAuthenticatedVendor, getAdminSiteContent);
siteContentVendorRouter.post(
  "/:section",
  isAuthenticatedVendor,
  upload.single("image"),
  addSiteContentItem
);
siteContentVendorRouter.delete(
  "/:section/:itemId",
  isAuthenticatedVendor,
  deleteSiteContentItem
);
siteContentVendorRouter.put(
  "/:section/:itemId",
  isAuthenticatedVendor,
  upload.single("image"),
  updateSiteContentItem
);

export default siteContentVendorRouter;
