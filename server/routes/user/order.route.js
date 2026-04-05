import express from "express";
import {
  createOrder,
  confirmPayment,
  validateCoupon,
  getUserOrders,
  getVendorOrders,
  downloadUserInvoice,
  downloadVendorInvoice,
  orderStatusUpdate,
  getUserNotifications,
  markUserNotificationsAsRead,
  deleteUserNotification,
  clearUserNotifications,
} from "../../controllers/user/order.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";

const orderRouter = express.Router();

orderRouter.post("/create", isAuthenticatedUser, createOrder);
orderRouter.post("/coupon/validate", isAuthenticatedUser, validateCoupon);
orderRouter.post("/confirm-payment", isAuthenticatedUser, confirmPayment);
orderRouter.get("/", isAuthenticatedUser, getUserOrders);
orderRouter.get("/invoice/:orderId", isAuthenticatedUser, downloadUserInvoice);
orderRouter.get("/vendor/invoice/:orderId", isAuthenticatedVendor, downloadVendorInvoice);
orderRouter.get("/notifications", isAuthenticatedUser, getUserNotifications);
orderRouter.patch("/notifications/read", isAuthenticatedUser, markUserNotificationsAsRead);
orderRouter.get("/vendor-orders", isAuthenticatedVendor, getVendorOrders);
orderRouter.delete(
  "/notifications/:id",
  isAuthenticatedUser,
  deleteUserNotification
);
orderRouter.delete("/notifications", isAuthenticatedUser, clearUserNotifications);
orderRouter.put("/status/:orderId", isAuthenticatedUser, orderStatusUpdate);
orderRouter.put(
  "/vendor/status/:orderId",
  isAuthenticatedVendor,
  orderStatusUpdate
);

export default orderRouter;
