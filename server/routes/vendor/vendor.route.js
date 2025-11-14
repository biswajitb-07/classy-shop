import express from "express";

import {
  login,
  logout,
  // register,
  sendResetOtp,
  resetPassword,
  changePassword,
  getVendorProfile,
  updateVendorProfile,
} from "../../controllers/vendor/vendor.controller.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../utils/multer.js";

const vendorRouter = express.Router();

// vendorRouter.post("/register", register);
vendorRouter.post("/login", login);
vendorRouter.get("/logout", logout);
vendorRouter.post("/send-reset-otp", sendResetOtp);
vendorRouter.post("/reset-password", resetPassword);
vendorRouter.post("/change-password", isAuthenticatedVendor, changePassword);

vendorRouter.get("/profile", isAuthenticatedVendor, getVendorProfile);
vendorRouter.put("/profile/update", isAuthenticatedVendor, upload.single("photo"), updateVendorProfile);

export default vendorRouter;
