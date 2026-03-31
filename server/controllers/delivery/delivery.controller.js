import bcrypt from "bcryptjs";
import Order from "../../models/user/order.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronics from "../../models/vendor/electronic/electronic.model.js";
import Bag from "../../models/vendor/bag/bag.model.js";
import Footwear from "../../models/vendor/footwear/footwear.model.js";
import Grocery from "../../models/vendor/grocery/grocery.model.js";
import Beauty from "../../models/vendor/beauty/beauty.model.js";
import Wellness from "../../models/vendor/wellness/wellness.model.js";
import Jewellery from "../../models/vendor/jewellery/jewellery.model.js";
import { DeliveryPartner } from "../../models/delivery/deliveryPartner.model.js";
import {
  clearDeliveryAuthCookies,
  setDeliveryAuthCookies,
} from "../../utils/authCookies.js";
import {
  createDeliveryPartnerSchema,
  deliveryLoginSchema,
} from "../../validation/delivery/delivery.validation.js";

const productModels = {
  Fashion,
  Electronics,
  Bag,
  Footwear,
  Grocery,
  Beauty,
  Wellness,
  Jewellery,
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const enrichOrders = async (orders = []) =>
  Promise.all(
    orders.map(async (order) => {
      const detailedItems = await Promise.all(
        (order.items || []).map(async (item) => {
          const Model = productModels[item.productType];
          if (!Model) return null;
          const product = await Model.findById(item.productId).lean();
          if (!product) return null;
          return {
            ...item,
            product,
          };
        })
      );

      return {
        ...order,
        items: detailedItems.filter(Boolean),
      };
    })
  );

export const createDeliveryPartner = async (req, res) => {
  try {
    const validated = createDeliveryPartnerSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validated.error.flatten(),
      });
    }

    const { name, email, password, phone, vehicleType } = validated.data;
    const normalizedEmail = normalizeEmail(email);

    const existingPartner = await DeliveryPartner.findOne({
      email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    });

    if (existingPartner) {
      return res.status(409).json({
        success: false,
        message: "Delivery partner email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const deliveryPartner = await DeliveryPartner.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      vehicleType: vehicleType || "bike",
    });

    return res.status(201).json({
      success: true,
      message: "Delivery partner created successfully",
      deliveryPartner: {
        ...deliveryPartner.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create delivery partner",
    });
  }
};

export const getDeliveryPartners = async (_req, res) => {
  try {
    const deliveryPartners = await DeliveryPartner.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      deliveryPartners,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load delivery partners",
    });
  }
};

export const toggleDeliveryPartnerBlock = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const deliveryPartner = await DeliveryPartner.findByIdAndUpdate(
      req.params.id,
      {
        isBlocked: Boolean(isBlocked),
      },
      { new: true }
    ).select("-password");

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    return res.status(200).json({
      success: true,
      deliveryPartner,
      message: deliveryPartner.isBlocked
        ? "Delivery partner blocked"
        : "Delivery partner unblocked",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery partner",
    });
  }
};

export const assignDeliveryPartner = async (req, res) => {
  try {
    const { deliveryPartnerId } = req.body;
    if (!deliveryPartnerId) {
      return res.status(400).json({
        success: false,
        message: "Delivery partner is required",
      });
    }

    const [order, deliveryPartner] = await Promise.all([
      Order.findById(req.params.orderId),
      DeliveryPartner.findById(deliveryPartnerId).select("-password"),
    ]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!deliveryPartner || deliveryPartner.isBlocked) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not available",
      });
    }

    order.assignedDeliveryPartner = deliveryPartner._id;
    order.assignedDeliveryAt = new Date();
    order.updatedAt = Date.now();
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery partner assigned successfully",
      order,
      deliveryPartner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to assign delivery partner",
    });
  }
};

export const loginDeliveryPartner = async (req, res) => {
  try {
    const validated = deliveryLoginSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validated.error.flatten(),
      });
    }

    const { email, password } = validated.data;
    const normalizedEmail = normalizeEmail(email);
    const deliveryPartner = await DeliveryPartner.findOne({
      email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    });

    if (!deliveryPartner) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (deliveryPartner.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    const isPasswordMatch = await bcrypt.compare(
      password,
      deliveryPartner.password
    );

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    deliveryPartner.lastActiveAt = new Date();
    await deliveryPartner.save();
    setDeliveryAuthCookies(res, deliveryPartner._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back ${deliveryPartner.name}`,
      deliveryPartner: {
        ...deliveryPartner.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

export const logoutDeliveryPartner = async (_req, res) => {
  try {
    clearDeliveryAuthCookies(res);
    return res.status(204).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

export const getDeliveryProfile = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findById(req.id).select(
      "-password"
    );

    if (!deliveryPartner) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      deliveryPartner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load profile",
    });
  }
};

export const toggleDeliveryAvailability = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findByIdAndUpdate(
      req.id,
      {
        isAvailable:
          req.body?.isAvailable === undefined
            ? undefined
            : Boolean(req.body.isAvailable),
        lastActiveAt: new Date(),
      },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      deliveryPartner,
      message: "Availability updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update availability",
    });
  }
};

export const getDeliveryDashboardSummary = async (req, res) => {
  try {
    const [assignedOrders, completedOrders, outForDeliveryOrders] =
      await Promise.all([
        Order.countDocuments({ assignedDeliveryPartner: req.id }),
        Order.countDocuments({
          assignedDeliveryPartner: req.id,
          orderStatus: "delivered",
        }),
        Order.countDocuments({
          assignedDeliveryPartner: req.id,
          orderStatus: "out_for_delivery",
        }),
      ]);

    return res.status(200).json({
      success: true,
      summary: {
        assignedOrders,
        completedOrders,
        outForDeliveryOrders,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
    });
  }
};

export const getAssignedOrders = async (req, res) => {
  try {
    const orders = await Order.find({ assignedDeliveryPartner: req.id })
      .populate("assignedDeliveryPartner", "name email phone vehicleType isAvailable")
      .sort({ createdAt: -1 })
      .lean();

    const detailedOrders = await enrichOrders(orders);

    return res.status(200).json({
      success: true,
      orders: detailedOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load assigned orders",
    });
  }
};
