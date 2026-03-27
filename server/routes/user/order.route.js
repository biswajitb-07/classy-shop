// File guide: order.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  createOrder,
  confirmPayment,
  getUserOrders,
  getVendorOrders,
  orderStatusUpdate,
  getUserNotifications,
  deleteUserNotification,
  clearUserNotifications,
} from "../../controllers/user/order.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";

const orderRouter = express.Router();

orderRouter.post("/create", isAuthenticatedUser, createOrder);
orderRouter.post("/confirm-payment", isAuthenticatedUser, confirmPayment);
orderRouter.get("/", isAuthenticatedUser, getUserOrders);
orderRouter.get("/notifications", isAuthenticatedUser, getUserNotifications);
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
