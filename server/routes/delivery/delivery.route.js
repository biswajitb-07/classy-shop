import express from "express";
import {
  clearDeliveryNotifications,
  deleteDeliveryNotification,
  getAssignedOrders,
  getDeliveryDashboardSummary,
  getDeliveryNotifications,
  getDeliveryProfile,
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

const deliveryRouter = express.Router();

deliveryRouter.post("/login", loginDeliveryPartner);
deliveryRouter.get("/logout", logoutDeliveryPartner);
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
  sendDeliveryCompletionOtp
);
deliveryRouter.post(
  "/orders/:orderId/delivery-otp/verify",
  isAuthenticatedDelivery,
  verifyDeliveryCompletionOtp
);
deliveryRouter.put(
  "/orders/:orderId/status",
  isAuthenticatedDelivery,
  orderStatusUpdate
);

export default deliveryRouter;
