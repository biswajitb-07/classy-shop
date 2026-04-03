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
import { DeliveryNotification } from "../../models/delivery/deliveryNotification.model.js";
import { DeliveryPayout } from "../../models/delivery/deliveryPayout.model.js";
import {
  clearDeliveryAuthCookies,
  signSocketToken,
  setDeliveryAuthCookies,
} from "../../utils/authCookies.js";
import {
  emitDeliveryAssignment,
  emitDeliveryDashboardUpdate,
  emitDeliveryNotificationUpdate,
} from "../../socket/socket.js";
import { ensureOrderShippingLocation } from "../../utils/geocoding.js";
import { sendPayoutStatusEmail } from "../../utils/emailService.js";
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
const DELIVERY_PAYOUT_PER_COMPLETED_ORDER = Number(process.env.DELIVERY_PAYOUT_PER_ORDER || 60);

const enrichOrders = async (orders = []) =>
  Promise.all(
    orders.map(async (order) => {
      const orderObject =
        typeof order?.toObject === "function" ? order.toObject() : order;
      const detailedItems = await Promise.all(
        (orderObject.items || []).map(async (item) => {
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
        ...orderObject,
        items: detailedItems.filter(Boolean),
      };
    })
  );

const ensureOrdersHaveShippingLocations = async (orders = []) => {
  await Promise.all(
    orders.map(async (order) => {
      const didUpdateLocation = await ensureOrderShippingLocation(order);
      if (didUpdateLocation) {
        await order.save();
      }
    })
  );
};

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
      .sort({ createdAt: -1, updatedAt: -1 });

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

export const deleteDeliveryPartner = async (req, res) => {
  try {
    const deliveryPartnerId = req.params.id;

    const activeAssignedOrders = await Order.countDocuments({
      assignedDeliveryPartner: deliveryPartnerId,
      orderStatus: {
        $in: ["processing", "shipped", "out_for_delivery"],
      },
    });

    if (activeAssignedOrders > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This delivery partner still has active assigned orders. Reassign or complete them before deleting.",
      });
    }

    const deletedPartner = await DeliveryPartner.findByIdAndDelete(
      deliveryPartnerId
    ).select("-password");

    if (!deletedPartner) {
      return res.status(404).json({
        success: false,
        message: "Delivery partner not found",
      });
    }

    await Promise.all([
      Order.updateMany(
        { assignedDeliveryPartner: deliveryPartnerId },
        {
          $set: {
            assignedDeliveryPartner: null,
            assignedDeliveryAt: null,
          },
        }
      ),
      DeliveryNotification.deleteMany({ deliveryPartnerId }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Delivery partner deleted successfully",
      deliveryPartner: deletedPartner,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete delivery partner",
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

    if (!deliveryPartner.isOnline || !deliveryPartner.isAvailable) {
      return res.status(409).json({
        success: false,
        message:
          "Delivery partner must be online and available before assignment",
      });
    }

    order.assignedDeliveryPartner = deliveryPartner._id;
    order.assignedDeliveryAt = new Date();
    order.updatedAt = Date.now();
    await order.save();

    await DeliveryNotification.create({
      deliveryPartnerId: deliveryPartner._id,
      orderId: order._id,
      type: "assignment",
      title: "New Delivery Assignment",
      message: `Order #${order.orderId} has been assigned to you.`,
    });

    emitDeliveryAssignment({
      deliveryPartnerId: deliveryPartner._id,
      orderId: order._id,
      message: `New order #${order.orderId} assigned to you`,
    });
    emitDeliveryDashboardUpdate(deliveryPartner._id);
    emitDeliveryNotificationUpdate(deliveryPartner._id);

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
    deliveryPartner.lastSeenAt = new Date();
    deliveryPartner.isOnline = true;
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

export const getDeliverySocketAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      socketToken: signSocketToken({
        deliveryPartnerId: req.id,
        role: "delivery",
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create socket auth token",
    });
  }
};

export const getDeliveryProfile = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findByIdAndUpdate(
      req.id,
      {
        isOnline: true,
        lastActiveAt: new Date(),
        lastSeenAt: new Date(),
      },
      { new: true }
    ).select("-password");

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
      message: deliveryPartner?.isAvailable
        ? "You are now online for new assignments"
        : "You are now offline for new assignments",
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
    const [
      assignedOrders,
      completedOrders,
      outForDeliveryOrders,
      returnPickupOrders,
      liveTrackingOrders,
      cancelledOrders,
      payoutHistory,
    ] =
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
        Order.countDocuments({
          assignedDeliveryPartner: req.id,
          orderStatus: "return_approved",
        }),
        Order.countDocuments({
          assignedDeliveryPartner: req.id,
          "deliveryTracking.isLive": true,
        }),
        Order.countDocuments({
          assignedDeliveryPartner: req.id,
          orderStatus: "cancelled",
        }),
        DeliveryPayout.find({ deliveryPartnerId: req.id }).sort({ createdAt: -1 }).lean(),
      ]);

    const payoutSummary = {
      approvedAmount: payoutHistory
        .filter((entry) => ["approved", "paid"].includes(entry.status))
        .reduce((sum, entry) => sum + Number(entry.payoutAmount || 0), 0),
      paidAmount: payoutHistory
        .filter((entry) => entry.status === "paid")
        .reduce((sum, entry) => sum + Number(entry.payoutAmount || 0), 0),
      rejectedAmount: payoutHistory
        .filter((entry) => entry.status === "rejected")
        .reduce((sum, entry) => sum + Number(entry.payoutAmount || 0), 0),
      totalPayouts: payoutHistory.length,
      recentPayouts: payoutHistory.slice(0, 5),
    };

    return res.status(200).json({
      success: true,
      summary: {
        assignedOrders,
        completedOrders,
        outForDeliveryOrders,
        returnPickupOrders,
        liveTrackingOrders,
        cancelledOrders,
        payoutSummary,
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
      .populate(
        "assignedDeliveryPartner",
        "name email phone vehicleType isAvailable isOnline lastSeenAt"
      )
      .sort({ createdAt: -1 });

    await ensureOrdersHaveShippingLocations(orders);

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

export const getDeliveryNotifications = async (req, res) => {
  try {
    const notifications = await DeliveryNotification.find({
      deliveryPartnerId: req.id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load notifications",
    });
  }
};

export const markDeliveryNotificationsAsRead = async (req, res) => {
  try {
    await DeliveryNotification.updateMany(
      {
        deliveryPartnerId: req.id,
        isRead: { $ne: true },
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
    });
  }
};

export const deleteDeliveryNotification = async (req, res) => {
  try {
    const notification = await DeliveryNotification.findOneAndDelete({
      _id: req.params.id,
      deliveryPartnerId: req.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

export const clearDeliveryNotifications = async (req, res) => {
  try {
    await DeliveryNotification.deleteMany({ deliveryPartnerId: req.id });

    return res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to clear notifications",
    });
  }
};

const buildDeliveryPayoutDesk = async () => {
  const [partners, orders, payoutHistory] = await Promise.all([
    DeliveryPartner.find({}).select("name email phone vehicleType isAvailable isOnline").lean(),
    Order.find({
      assignedDeliveryPartner: { $ne: null },
      orderStatus: { $in: ["delivered", "return_completed"] },
    })
      .select("assignedDeliveryPartner orderStatus updatedAt")
      .lean(),
    DeliveryPayout.find({})
      .populate("deliveryPartnerId", "name email phone vehicleType")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const lockedStatuses = new Set(["approved", "paid"]);
  const lockedOrderIds = new Set(
    payoutHistory
      .filter((entry) => lockedStatuses.has(entry.status))
      .flatMap((entry) => (entry.orderIds || []).map((orderId) => String(orderId)))
  );

  const queue = partners
    .map((partner) => {
      const availableOrders = orders.filter(
        (order) =>
          String(order.assignedDeliveryPartner || "") === String(partner._id) &&
          !lockedOrderIds.has(String(order._id))
      );
      const completedOrdersCount = availableOrders.length;
      const payoutAmount = completedOrdersCount * DELIVERY_PAYOUT_PER_COMPLETED_ORDER;

      return {
        deliveryPartner: partner,
        orderIds: availableOrders.map((order) => order._id),
        completedOrdersCount,
        payoutAmount,
        perOrderAmount: DELIVERY_PAYOUT_PER_COMPLETED_ORDER,
      };
    })
    .filter((entry) => entry.completedOrdersCount > 0)
    .sort((a, b) => b.payoutAmount - a.payoutAmount);

  const summary = {
    totalDeliveryPartners: partners.length,
    partnersWithPendingPayouts: queue.length,
    totalPayableAmount: queue.reduce((sum, entry) => sum + Number(entry.payoutAmount || 0), 0),
    totalPaidAmount: payoutHistory
      .filter((entry) => entry.status === "paid")
      .reduce((sum, entry) => sum + Number(entry.payoutAmount || 0), 0),
  };

  return {
    queue,
    payoutHistory,
    summary,
  };
};

export const getAdminDeliveryPayoutDesk = async (_req, res) => {
  try {
    const desk = await buildDeliveryPayoutDesk();
    return res.status(200).json({
      success: true,
      ...desk,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load delivery payout desk",
    });
  }
};

export const getDeliveryPayouts = async (req, res) => {
  try {
    const payoutHistory = await DeliveryPayout.find({
      deliveryPartnerId: req.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      payouts: payoutHistory,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load delivery payouts",
    });
  }
};

export const approveDeliveryPayout = async (req, res) => {
  try {
    const { deliveryPartnerId, processedNotes = "" } = req.body || {};

    if (!deliveryPartnerId) {
      return res.status(400).json({
        success: false,
        message: "Delivery partner id is required",
      });
    }

    const desk = await buildDeliveryPayoutDesk();
    const queueEntry = desk.queue.find(
      (entry) => String(entry.deliveryPartner?._id || "") === String(deliveryPartnerId)
    );

    if (!queueEntry) {
      return res.status(404).json({
        success: false,
        message: "No payable delivery balance found for this partner",
      });
    }

    const payout = await DeliveryPayout.create({
      deliveryPartnerId,
      orderIds: queueEntry.orderIds,
      completedOrdersCount: queueEntry.completedOrdersCount,
      perOrderAmount: queueEntry.perOrderAmount,
      payoutAmount: queueEntry.payoutAmount,
      status: "approved",
      processedNotes,
      processedAt: new Date(),
    });

    await DeliveryNotification.create({
      deliveryPartnerId,
      type: "system",
      title: "Payout approved",
      message: `Rs ${Number(queueEntry.payoutAmount || 0).toLocaleString("en-IN")} payout approved for ${queueEntry.completedOrdersCount} completed deliveries.`,
    });

    emitDeliveryNotificationUpdate(deliveryPartnerId);
    emitDeliveryDashboardUpdate(deliveryPartnerId);

    const partner = await DeliveryPartner.findById(deliveryPartnerId).select("name email");
    if (partner?.email) {
      try {
        await sendPayoutStatusEmail({
          to: partner.email,
          name: partner.name,
          accountType: "delivery",
          amount: queueEntry.payoutAmount,
          status: "approved",
          note: processedNotes,
        });
      } catch (mailErr) {
        console.error("Delivery payout approval email error:", mailErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Delivery payout approved successfully",
      payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve delivery payout",
    });
  }
};

export const updateDeliveryPayoutStatus = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { status, processedNotes = "" } = req.body || {};

    if (!["approved", "paid", "rejected"].includes(String(status || ""))) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout status",
      });
    }

    const payout = await DeliveryPayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        message: "Delivery payout not found",
      });
    }

    if (payout.status === "paid" && status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Paid delivery payouts cannot be changed",
      });
    }

    payout.status = status;
    payout.processedNotes = processedNotes;
    payout.processedAt = new Date();
    payout.paidAt = status === "paid" ? new Date() : payout.paidAt;
    await payout.save();

    await DeliveryNotification.create({
      deliveryPartnerId: payout.deliveryPartnerId,
      type: "system",
      title: `Payout ${status}`,
      message: `Your payout of Rs ${Number(payout.payoutAmount || 0).toLocaleString("en-IN")} is now ${status}.${processedNotes ? ` Note: ${processedNotes}` : ""}`,
    });

    emitDeliveryNotificationUpdate(payout.deliveryPartnerId);
    emitDeliveryDashboardUpdate(payout.deliveryPartnerId);

    const partner = await DeliveryPartner.findById(payout.deliveryPartnerId).select("name email");
    if (partner?.email) {
      try {
        await sendPayoutStatusEmail({
          to: partner.email,
          name: partner.name,
          accountType: "delivery",
          amount: payout.payoutAmount,
          status,
          note: processedNotes,
        });
      } catch (mailErr) {
        console.error("Delivery payout status email error:", mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Delivery payout ${status} successfully`,
      payout,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update delivery payout status",
    });
  }
};
