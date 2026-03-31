import express from "express";

import {
  createVendor,
  login,
  logout,
  // register,
  sendResetOtp,
  resetPassword,
  changePassword,
  getVendorProfile,
  getVendorSocketAuth,
  getDashboardSummary,
  updateVendorProfile,
  getAllUsers,
  getAllVendors,
  getNewsletterSubscribers,
  exportNewsletterSubscribersCsv,
  updateUserById,
  deleteUserById,
  toggleUserBlock,
  updateVendorById,
  deleteVendorById,
  toggleVendorBlock,
  getVendorNotifications,
  deleteVendorNotification,
  clearVendorNotifications,
} from "../../controllers/vendor/vendor.controller.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../utils/multer.js";
import {
  deleteVendorSupportConversation,
  getVendorSupportConversationDetails,
  getVendorSupportConversations,
  sendVendorSupportReply,
} from "../../controllers/support/support.controller.js";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  toggleCouponStatus,
} from "../../controllers/vendor/coupon.controller.js";
import {
  assignDeliveryPartner,
  createDeliveryPartner,
  deleteDeliveryPartner,
  getDeliveryPartners,
  toggleDeliveryPartnerBlock,
} from "../../controllers/delivery/delivery.controller.js";
import siteContentVendorRouter from "./siteContent.route.js";
import { createRateLimiter } from "../../utils/security.js";

const vendorRouter = express.Router();
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) =>
    `vendor-auth:${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many auth attempts. Please try again later.",
});
const otpSendRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    `vendor-reset-send:${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many OTP requests. Please try again later.",
});
const otpVerifyRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    `vendor-reset-verify:${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many OTP verification attempts. Please try again later.",
});

vendorRouter.post("/vendors", isAuthenticatedVendor, createVendor);
vendorRouter.post("/login", authRateLimit, login);
vendorRouter.post("/logout", logout);
vendorRouter.post("/send-reset-otp", otpSendRateLimit, sendResetOtp);
vendorRouter.post("/reset-password", otpVerifyRateLimit, resetPassword);
vendorRouter.post("/change-password", isAuthenticatedVendor, changePassword);
vendorRouter.get("/socket-auth", isAuthenticatedVendor, getVendorSocketAuth);

vendorRouter.get("/profile", isAuthenticatedVendor, getVendorProfile);
vendorRouter.get("/dashboard-summary", isAuthenticatedVendor, getDashboardSummary);
vendorRouter.put("/profile/update", isAuthenticatedVendor, upload.single("photo"), updateVendorProfile);

vendorRouter.get("/users", isAuthenticatedVendor, getAllUsers);
vendorRouter.get("/vendors", isAuthenticatedVendor, getAllVendors);
vendorRouter.get("/newsletter/subscribers", isAuthenticatedVendor, getNewsletterSubscribers);
vendorRouter.get(
  "/newsletter/subscribers/export",
  isAuthenticatedVendor,
  exportNewsletterSubscribersCsv
);
vendorRouter.put("/users/:id", isAuthenticatedVendor, updateUserById);
vendorRouter.delete("/users/:id", isAuthenticatedVendor, deleteUserById);
vendorRouter.patch("/users/:id/block", isAuthenticatedVendor, toggleUserBlock);
vendorRouter.put("/vendors/:id", isAuthenticatedVendor, updateVendorById);
vendorRouter.delete("/vendors/:id", isAuthenticatedVendor, deleteVendorById);
vendorRouter.patch("/vendors/:id/block", isAuthenticatedVendor, toggleVendorBlock);
vendorRouter.get("/notifications", isAuthenticatedVendor, getVendorNotifications);
vendorRouter.delete("/notifications/:id", isAuthenticatedVendor, deleteVendorNotification);
vendorRouter.delete("/notifications", isAuthenticatedVendor, clearVendorNotifications);
vendorRouter.get("/coupons", isAuthenticatedVendor, getCoupons);
vendorRouter.post("/coupons", isAuthenticatedVendor, createCoupon);
vendorRouter.patch("/coupons/:id/toggle", isAuthenticatedVendor, toggleCouponStatus);
vendorRouter.delete("/coupons/:id", isAuthenticatedVendor, deleteCoupon);
vendorRouter.get("/delivery-partners", isAuthenticatedVendor, getDeliveryPartners);
vendorRouter.post("/delivery-partners", isAuthenticatedVendor, createDeliveryPartner);
vendorRouter.patch(
  "/delivery-partners/:id/block",
  isAuthenticatedVendor,
  toggleDeliveryPartnerBlock
);
vendorRouter.delete(
  "/delivery-partners/:id",
  isAuthenticatedVendor,
  deleteDeliveryPartner
);
vendorRouter.patch(
  "/orders/:orderId/assign-delivery",
  isAuthenticatedVendor,
  assignDeliveryPartner
);
vendorRouter.get("/support/conversations", isAuthenticatedVendor, getVendorSupportConversations);
vendorRouter.get(
  "/support/conversations/:conversationId",
  isAuthenticatedVendor,
  getVendorSupportConversationDetails
);
vendorRouter.post(
  "/support/conversations/:conversationId/reply",
  isAuthenticatedVendor,
  upload.array("attachments", 4),
  sendVendorSupportReply
);
vendorRouter.delete(
  "/support/conversations/:conversationId",
  isAuthenticatedVendor,
  deleteVendorSupportConversation
);
vendorRouter.use("/site-content", siteContentVendorRouter);

export default vendorRouter;
