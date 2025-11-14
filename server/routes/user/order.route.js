import express from "express";
import {
  createOrder,
  confirmPayment,
  getUserOrders,
  getVendorOrders,
  orderStatusUpdate,
} from "../../controllers/user/order.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import isAuthenticatedVendor from "../../middleware/vendor/isAuthenticatedVendor.js";

const orderRouter = express.Router();

orderRouter.post("/create", isAuthenticatedUser, createOrder);
orderRouter.post("/confirm-payment", isAuthenticatedUser, confirmPayment);
orderRouter.get("/", isAuthenticatedUser, getUserOrders);
orderRouter.get("/vendor-orders", isAuthenticatedVendor, getVendorOrders);
orderRouter.put("/status/:orderId", isAuthenticatedUser, orderStatusUpdate);
orderRouter.put(
  "/vendor/status/:orderId",
  isAuthenticatedVendor,
  orderStatusUpdate
);

export default orderRouter;
