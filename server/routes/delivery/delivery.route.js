import express from "express";
import {
  getAssignedOrders,
  getDeliveryDashboardSummary,
  getDeliveryProfile,
  loginDeliveryPartner,
  logoutDeliveryPartner,
  toggleDeliveryAvailability,
} from "../../controllers/delivery/delivery.controller.js";
import isAuthenticatedDelivery from "../../middleware/delivery/isAuthenticatedDelivery.js";
import { orderStatusUpdate } from "../../controllers/user/order.controller.js";

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
deliveryRouter.get("/orders", isAuthenticatedDelivery, getAssignedOrders);
deliveryRouter.put(
  "/orders/:orderId/status",
  isAuthenticatedDelivery,
  orderStatusUpdate
);

export default deliveryRouter;
