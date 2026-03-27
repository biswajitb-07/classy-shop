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

const vendorRouter = express.Router();

vendorRouter.post("/vendors", isAuthenticatedVendor, createVendor);
vendorRouter.post("/login", login);
vendorRouter.get("/logout", logout);
vendorRouter.post("/send-reset-otp", sendResetOtp);
vendorRouter.post("/reset-password", resetPassword);
vendorRouter.post("/change-password", isAuthenticatedVendor, changePassword);
vendorRouter.get("/socket-auth", isAuthenticatedVendor, getVendorSocketAuth);

vendorRouter.get("/profile", isAuthenticatedVendor, getVendorProfile);
vendorRouter.get("/dashboard-summary", isAuthenticatedVendor, getDashboardSummary);
vendorRouter.put("/profile/update", isAuthenticatedVendor, upload.single("photo"), updateVendorProfile);

vendorRouter.get("/users", isAuthenticatedVendor, getAllUsers);
vendorRouter.get("/vendors", isAuthenticatedVendor, getAllVendors);
vendorRouter.put("/users/:id", isAuthenticatedVendor, updateUserById);
vendorRouter.delete("/users/:id", isAuthenticatedVendor, deleteUserById);
vendorRouter.patch("/users/:id/block", isAuthenticatedVendor, toggleUserBlock);
vendorRouter.put("/vendors/:id", isAuthenticatedVendor, updateVendorById);
vendorRouter.delete("/vendors/:id", isAuthenticatedVendor, deleteVendorById);
vendorRouter.patch("/vendors/:id/block", isAuthenticatedVendor, toggleVendorBlock);
vendorRouter.get("/notifications", isAuthenticatedVendor, getVendorNotifications);
vendorRouter.delete("/notifications/:id", isAuthenticatedVendor, deleteVendorNotification);
vendorRouter.delete("/notifications", isAuthenticatedVendor, clearVendorNotifications);
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

export default vendorRouter;
