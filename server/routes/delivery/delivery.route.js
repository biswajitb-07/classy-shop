import express from "express";
import {
  clearDeliveryNotifications,
  deleteDeliveryNotification,
  getAssignedOrders,
  getDeliveryDashboardSummary,
  getDeliveryNotifications,
  getDeliveryProfile,
  getDeliverySocketAuth,
  loginDeliveryPartner,
  logoutDeliveryPartner,
  toggleDeliveryAvailability,
} from "../../controllers/delivery/delivery.controller.js";
import isAuthenticatedDelivery from "../../middleware/delivery/isAuthenticatedDelivery.js";
import {
  orderStatusUpdate,
  sendDeliveryCompletionOtp,
  verifyDeliveryCompletionOtp,
} from "../../controllers/user/order.controller.js";
import { createRateLimiter } from "../../utils/security.js";

const deliveryRouter = express.Router();
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyGenerator: (req) =>
    `delivery-auth:${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many auth attempts. Please try again later.",
});
const otpRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) =>
    `delivery-otp:${req.ip}:${String(req.params?.orderId || "")}`,
  message: "Too many OTP attempts. Please try again later.",
});

deliveryRouter.post("/login", authRateLimit, loginDeliveryPartner);
deliveryRouter.post("/logout", logoutDeliveryPartner);
deliveryRouter.get("/socket-auth", isAuthenticatedDelivery, getDeliverySocketAuth);
deliveryRouter.get("/profile", isAuthenticatedDelivery, getDeliveryProfile);
deliveryRouter.get(
  "/dashboard-summary",
  isAuthenticatedDelivery,
  getDeliveryDashboardSummary
);
deliveryRouter.patch(
  "/availability",
  isAuthenticatedDelivery,
  toggleDeliveryAvailability
);
deliveryRouter.get(
  "/notifications",
  isAuthenticatedDelivery,
  getDeliveryNotifications
);
deliveryRouter.delete(
  "/notifications/:id",
  isAuthenticatedDelivery,
  deleteDeliveryNotification
);
deliveryRouter.delete(
  "/notifications",
  isAuthenticatedDelivery,
  clearDeliveryNotifications
);
deliveryRouter.get("/orders", isAuthenticatedDelivery, getAssignedOrders);
deliveryRouter.post(
  "/orders/:orderId/delivery-otp/send",
  isAuthenticatedDelivery,
  otpRateLimit,
  sendDeliveryCompletionOtp
);
deliveryRouter.post(
  "/orders/:orderId/delivery-otp/verify",
  isAuthenticatedDelivery,
  otpRateLimit,
  verifyDeliveryCompletionOtp
);
deliveryRouter.put(
  "/orders/:orderId/status",
  isAuthenticatedDelivery,
  orderStatusUpdate
);

export default deliveryRouter;
