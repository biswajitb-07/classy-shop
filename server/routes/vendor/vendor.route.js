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
  markVendorNotificationsAsRead,
  deleteVendorNotification,
  clearVendorNotifications,
  getVendorPayoutSummary,
  getVendorPayoutRequests,
  getAllVendorPayoutRequests,
  requestVendorPayout,
  updateVendorPayoutStatus,
  exportVendorPayoutsCsv,
  exportVendorOrdersReportCsv,
  exportVendorSummaryReportCsv,
} from "../../controllers/vendor/vendor.controller.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";
import isAuthenticatedAdmin from "../../middleware/admin/isAuthenticatedAdmin.js";
import upload from "../../utils/multer.js";
import {
  adminLogin,
  adminChangePassword,
  adminResetPassword,
  createAdmin,
  clearAdminNotifications,
  deleteAdminNotification,
  deleteAdminById,
  getAdminProfile,
  getAdminNotifications,
  getAdminSocketAuth,
  getAllAdmins,
  logoutAdmin,
  markAdminNotificationsAsRead,
  sendAdminResetOtp,
  toggleAdminBlock,
  updateAdminProfile,
  updateAdminById,
} from "../../controllers/admin/admin.controller.js";
import {
  deleteVendorSupportConversation,
  ensureAdminUserSupportConversation,
  getVendorSupportConversationDetails,
  getVendorSupportConversations,
  sendVendorSupportReply,
} from "../../controllers/support/support.controller.js";
import {
  deleteVendorAdminConversation,
  ensureAdminVendorSupportConversation,
  getAdminVendorSupportConversations,
  getVendorAdminConversationDetails,
  getVendorAdminConversations,
  sendVendorAdminMessage,
} from "../../controllers/support/vendorAdminSupport.controller.js";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  toggleCouponStatus,
} from "../../controllers/vendor/coupon.controller.js";
import {
  approveDeliveryPayout,
  assignDeliveryPartner,
  createDeliveryPartner,
  deleteDeliveryPartner,
  getDeliveryPartners,
  getAdminDeliveryPayoutDesk,
  toggleDeliveryPartnerBlock,
  updateDeliveryPayoutStatus,
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

vendorRouter.post("/vendors", isAuthenticatedAdmin, createVendor);
vendorRouter.post("/login", authRateLimit, login);
vendorRouter.post("/admin/login", authRateLimit, adminLogin);
vendorRouter.post("/logout", logout);
vendorRouter.post("/admin/logout", logoutAdmin);
vendorRouter.post("/send-reset-otp", otpSendRateLimit, sendResetOtp);
vendorRouter.post("/admin/send-reset-otp", otpSendRateLimit, sendAdminResetOtp);
vendorRouter.post("/reset-password", otpVerifyRateLimit, resetPassword);
vendorRouter.post("/admin/reset-password", otpVerifyRateLimit, adminResetPassword);
vendorRouter.post("/change-password", isAuthenticatedVendor, changePassword);
vendorRouter.post("/admin/change-password", isAuthenticatedAdmin, adminChangePassword);
vendorRouter.get("/socket-auth", isAuthenticatedVendor, getVendorSocketAuth);
vendorRouter.get("/admin/socket-auth", isAuthenticatedAdmin, getAdminSocketAuth);

vendorRouter.get("/profile", isAuthenticatedVendor, getVendorProfile);
vendorRouter.get("/admin/profile", isAuthenticatedAdmin, getAdminProfile);
vendorRouter.get("/dashboard-summary", isAuthenticatedVendor, getDashboardSummary);
vendorRouter.get("/admin/dashboard-summary", isAuthenticatedAdmin, getDashboardSummary);
vendorRouter.put("/profile/update", isAuthenticatedVendor, upload.single("photo"), updateVendorProfile);
vendorRouter.put("/admin/profile/update", isAuthenticatedAdmin, upload.single("photo"), updateAdminProfile);

vendorRouter.get("/admins", isAuthenticatedAdmin, getAllAdmins);
vendorRouter.post("/admins", isAuthenticatedAdmin, createAdmin);
vendorRouter.put("/admins/:id", isAuthenticatedAdmin, updateAdminById);
vendorRouter.delete("/admins/:id", isAuthenticatedAdmin, deleteAdminById);
vendorRouter.patch("/admins/:id/block", isAuthenticatedAdmin, toggleAdminBlock);
vendorRouter.get("/notifications", isAuthenticatedAdmin, getAdminNotifications);
vendorRouter.patch("/notifications/read", isAuthenticatedAdmin, markAdminNotificationsAsRead);
vendorRouter.delete("/notifications/:id", isAuthenticatedAdmin, deleteAdminNotification);
vendorRouter.delete("/notifications", isAuthenticatedAdmin, clearAdminNotifications);

vendorRouter.get("/users", isAuthenticatedAdmin, getAllUsers);
vendorRouter.get("/vendors", isAuthenticatedAdmin, getAllVendors);
vendorRouter.get("/newsletter/subscribers", isAuthenticatedAdmin, getNewsletterSubscribers);
vendorRouter.get(
  "/newsletter/subscribers/export",
  isAuthenticatedAdmin,
  exportNewsletterSubscribersCsv
);
vendorRouter.put("/users/:id", isAuthenticatedAdmin, updateUserById);
vendorRouter.delete("/users/:id", isAuthenticatedAdmin, deleteUserById);
vendorRouter.patch("/users/:id/block", isAuthenticatedAdmin, toggleUserBlock);
vendorRouter.put("/vendors/:id", isAuthenticatedAdmin, updateVendorById);
vendorRouter.delete("/vendors/:id", isAuthenticatedAdmin, deleteVendorById);
vendorRouter.patch("/vendors/:id/block", isAuthenticatedAdmin, toggleVendorBlock);
vendorRouter.get("/vendor-notifications", isAuthenticatedVendor, getVendorNotifications);
vendorRouter.patch("/vendor-notifications/read", isAuthenticatedVendor, markVendorNotificationsAsRead);
vendorRouter.delete("/vendor-notifications/:id", isAuthenticatedVendor, deleteVendorNotification);
vendorRouter.delete("/vendor-notifications", isAuthenticatedVendor, clearVendorNotifications);
vendorRouter.get("/payouts/summary", isAuthenticatedVendor, getVendorPayoutSummary);
vendorRouter.get("/payouts", isAuthenticatedVendor, getVendorPayoutRequests);
vendorRouter.get("/payouts/admin/all", isAuthenticatedAdmin, getAllVendorPayoutRequests);
vendorRouter.post("/payouts/request", isAuthenticatedVendor, requestVendorPayout);
vendorRouter.patch("/payouts/:payoutId/status", isAuthenticatedAdmin, updateVendorPayoutStatus);
vendorRouter.get("/payouts/export", isAuthenticatedVendor, exportVendorPayoutsCsv);
vendorRouter.get("/reports/orders/export", isAuthenticatedAdmin, exportVendorOrdersReportCsv);
vendorRouter.get("/reports/summary/export", isAuthenticatedAdmin, exportVendorSummaryReportCsv);
vendorRouter.get("/coupons", isAuthenticatedAdmin, getCoupons);
vendorRouter.post("/coupons", isAuthenticatedAdmin, createCoupon);
vendorRouter.patch("/coupons/:id/toggle", isAuthenticatedAdmin, toggleCouponStatus);
vendorRouter.delete("/coupons/:id", isAuthenticatedAdmin, deleteCoupon);
vendorRouter.get("/delivery-partners", isAuthenticatedAdmin, getDeliveryPartners);
vendorRouter.post("/delivery-partners", isAuthenticatedAdmin, createDeliveryPartner);
vendorRouter.patch(
  "/delivery-partners/:id/block",
  isAuthenticatedAdmin,
  toggleDeliveryPartnerBlock
);
vendorRouter.delete(
  "/delivery-partners/:id",
  isAuthenticatedAdmin,
  deleteDeliveryPartner
);
vendorRouter.get("/delivery-payouts", isAuthenticatedAdmin, getAdminDeliveryPayoutDesk);
vendorRouter.post("/delivery-payouts/approve", isAuthenticatedAdmin, approveDeliveryPayout);
vendorRouter.patch(
  "/delivery-payouts/:payoutId/status",
  isAuthenticatedAdmin,
  updateDeliveryPayoutStatus
);
vendorRouter.patch(
  "/orders/:orderId/assign-delivery",
  isAuthenticatedVendor,
  assignDeliveryPartner
);
vendorRouter.get("/support/conversations", isAuthenticatedAdmin, getVendorSupportConversations);
vendorRouter.post(
  "/support/conversations/users/:userId",
  isAuthenticatedAdmin,
  ensureAdminUserSupportConversation
);
vendorRouter.get(
  "/support/conversations/:conversationId",
  isAuthenticatedAdmin,
  getVendorSupportConversationDetails
);
vendorRouter.post(
  "/support/conversations/:conversationId/reply",
  isAuthenticatedAdmin,
  upload.array("attachments", 4),
  sendVendorSupportReply
);
vendorRouter.delete(
  "/support/conversations/:conversationId",
  isAuthenticatedAdmin,
  deleteVendorSupportConversation
);
vendorRouter.get("/admin-support/conversations", isAuthenticatedVendor, getVendorAdminConversations);
vendorRouter.get(
  "/admin-support/conversations/:conversationId",
  isAuthenticatedVendor,
  getVendorAdminConversationDetails
);
vendorRouter.post(
  "/admin-support/conversations/:conversationId/reply",
  isAuthenticatedVendor,
  upload.array("attachments", 4),
  sendVendorAdminMessage
);
vendorRouter.delete(
  "/admin-support/conversations/:conversationId",
  isAuthenticatedVendor,
  deleteVendorAdminConversation
);
vendorRouter.get(
  "/admin/vendor-support/conversations",
  isAuthenticatedAdmin,
  getAdminVendorSupportConversations
);
vendorRouter.post(
  "/admin/vendor-support/conversations/vendors/:vendorId",
  isAuthenticatedAdmin,
  ensureAdminVendorSupportConversation
);
vendorRouter.get(
  "/admin/vendor-support/conversations/:conversationId",
  isAuthenticatedAdmin,
  getVendorAdminConversationDetails
);
vendorRouter.post(
  "/admin/vendor-support/conversations/:conversationId/reply",
  isAuthenticatedAdmin,
  upload.array("attachments", 4),
  sendVendorAdminMessage
);
vendorRouter.delete(
  "/admin/vendor-support/conversations/:conversationId",
  isAuthenticatedAdmin,
  deleteVendorAdminConversation
);
vendorRouter.use("/site-content", siteContentVendorRouter);

export default vendorRouter;
