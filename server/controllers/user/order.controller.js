import Razorpay from "razorpay";
import crypto from "crypto";
import { Cart } from "../../models/user/cart.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronics from "../../models/vendor/electronic/electronic.model.js";
import Order from "../../models/user/order.model.js";

const productModels = {
  Fashion,
  Electronics,
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const computeOrderDetailsFromCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }
  let totalAmount = 0;
  const orderItems = [];
  for (const item of cart.items) {
    const Model = productModels[item.productType];
    if (!Model) {
      throw new Error(`Invalid product type: ${item.productType}`);
    }
    const product = await Model.findById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }
    const price = product.discountedPrice;
    if (price === undefined || price === null || isNaN(price) || price < 0) {
      throw new Error(
        `Invalid or missing discountedPrice for product: ${item.productId}`
      );
    }
    if (!Array.isArray(item.variants) || item.variants.length === 0) {
      throw new Error(`No variants for cart item: ${item.productId}`);
    }
    for (const variant of item.variants) {
      const qty = variant.quantity;
      if (!qty || qty < 1) continue;
      const subtotal = price * qty;
      totalAmount += subtotal;
      orderItems.push({
        productId: item.productId,
        productType: item.productType,
        variant: variant.variant,
        quantity: qty,
        price,
        subtotal,
      });
    }
  }
  if (totalAmount === 0 || orderItems.length === 0) {
    throw new Error("No valid items in cart");
  }
  return { totalAmount, orderItems, cart };
};

export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const userId = req.id;
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and payment method are required",
      });
    }
    if (!["razorpay", "cod"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }
    const { totalAmount, orderItems, cart } = await computeOrderDetailsFromCart(
      userId
    );
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    if (paymentMethod === "cod") {
      const order = new Order({
        userId,
        items: orderItems,
        totalAmount,
        shippingAddress,
        paymentMethod,
        paymentStatus: "pending",
        orderStatus: "pending",
        orderId,
      });
      await order.save();
      cart.items = [];
      await cart.save();
      return res
        .status(201)
        .json({ success: true, message: "Order created successfully", order });
    } else {
      const options = {
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: orderId,
        notes: {
          userId: userId.toString(),
          shippingAddress: JSON.stringify(shippingAddress),
        },
      };
      const rzOrder = await razorpay.orders.create(options);
      return res.status(200).json({
        success: true,
        razorpayOrderId: rzOrder.id,
        amount: rzOrder.amount,
        currency: rzOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

export const confirmPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing payment details" });
    }
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    if (generatedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }
    const rzOrder = await razorpay.orders.fetch(razorpay_order_id);
    if (rzOrder.status !== "paid") {
      return res
        .status(400)
        .json({ success: false, message: "Payment not captured" });
    }
    const notes = rzOrder.notes;
    if (!notes || !notes.userId || !notes.shippingAddress) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order reference" });
    }
    const userId = notes.userId;
    const shippingAddress = JSON.parse(notes.shippingAddress);
    const { totalAmount, orderItems, cart } = await computeOrderDetailsFromCart(
      userId
    );
    if (Math.round(totalAmount * 100) !== rzOrder.amount) {
      return res.status(400).json({
        success: false,
        message: "Amount mismatch - cart may have changed",
      });
    }
    const orderId = rzOrder.receipt;
    const order = new Order({
      userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: "razorpay",
      paymentStatus: "completed",
      orderStatus: "processing",
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });
    await order.save();
    cart.items = [];
    await cart.save();
    return res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm payment",
      error: error.message,
    });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.id;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const detailedItems = await Promise.all(
          order.items.map(async (item) => {
            const Model = productModels[item.productType];
            if (!Model) return null;
            const product = await Model.findById(item.productId).lean();
            if (!product) return null;
            return {
              ...item.toObject(),
              product,
            };
          })
        );
        return {
          ...order.toObject(),
          items: detailedItems.filter(Boolean),
        };
      })
    );
    return res.status(200).json({ success: true, orders: detailedOrders });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get orders" });
  }
};

export const getVendorOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    const detailedOrders = await Promise.all(
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
    return res.status(200).json({ success: true, orders: detailedOrders });
  } catch (error) {
    console.error("getVendorOrders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get orders" });
  }
};

export const orderStatusUpdate = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const { orderId } = req.params;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "return_requested",
      "return_approved",
      "return_rejected",
      "return_completed",
    ];

    if (!allowedStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const role = req.role;
    if (!role) {
      return res.status(401).json({
        success: false,
        message:
          "Role missing from request (auth middleware must set req.role)",
      });
    }

    if (!req.id) {
      return res.status(401).json({
        success: false,
        message:
          "User/Vendor id missing from request (auth middleware must set req.id)",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    console.log(req.role);

    if (role === "user") {
      if (order.userId.toString() !== req.id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized for this order" });
      }

      // Allow user to request return only when delivered
      if (status === "return_requested") {
        if (order.orderStatus !== "delivered") {
          return res.status(400).json({
            success: false,
            message: "Return can only be requested after delivery",
          });
        }

        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "return_requested",
          by: req.id,
          role: "user",
          reason: reason || "",
          at: new Date(),
        });

        order.orderStatus = "return_requested";
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({
          success: true,
          message: "Return requested successfully",
          order,
        });
      }

      // Allow user to cancel if order is pending or processing
      if (status === "cancelled") {
        if (!["pending", "processing"].includes(order.orderStatus)) {
          return res.status(400).json({
            success: false,
            message:
              "You can only cancel orders that are pending or processing",
          });
        }

        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === "completed"
        ) {
          order.paymentStatus = "refund";
          order.refundRequestedAt = new Date();
        }

        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "cancelled",
          by: req.id,
          role: "user",
          reason: reason || "Cancelled by user",
          at: new Date(),
        });

        order.orderStatus = "cancelled";
        order.updatedAt = Date.now();
        await order.save();

        return res.status(200).json({
          success: true,
          message: "Order cancelled successfully",
          order,
        });
      }

      return res.status(403).json({
        success: false,
        message: "Users can only request returns or cancel orders",
      });
    }

    if (role === "vendor") {
      const vendorAllowed = [
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "return_approved",
        "return_rejected",
        "return_completed",
      ];
      if (!vendorAllowed.includes(status)) {
        return res
          .status(403)
          .json({ success: false, message: "Vendors cannot set that status" });
      }

      if (order.orderStatus === "cancelled" && status !== "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Order already cancelled and cannot be changed",
        });
      }

      if (
        order.orderStatus === "delivered" &&
        !status.startsWith("return") &&
        status !== "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot change a delivered order to '${status}'`,
        });
      }

      if (status === "return_approved") {
        if (order.orderStatus !== "return_requested") {
          return res.status(400).json({
            success: false,
            message: "Only return_requested orders can be approved",
          });
        }
        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === "completed"
        ) {
          order.paymentStatus = "refund";
          order.refundRequestedAt = new Date();
        }
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "return_approved",
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = "return_approved";
      } else if (status === "return_rejected") {
        if (order.orderStatus !== "return_requested") {
          return res.status(400).json({
            success: false,
            message: "Only return_requested orders can be rejected",
          });
        }
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "return_rejected",
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = "return_rejected";
      } else if (status === "return_completed") {
        if (order.orderStatus !== "return_approved") {
          return res.status(400).json({
            success: false,
            message: "Only return_approved orders can be completed",
          });
        }
        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === "completed"
        ) {
          order.paymentStatus = "refund";
          order.refundCompletedAt = new Date();
        }
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "return_completed",
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = "return_completed";
      } else if (status === "cancelled") {
        if (order.orderStatus === "delivered") {
          return res.status(400).json({
            success: false,
            message: "Cannot cancel an order that is already delivered",
          });
        }
        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === "completed"
        ) {
          order.paymentStatus = "refund";
          order.refundRequestedAt = new Date();
        }
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: "cancelled",
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = "cancelled";
      } else {
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: status,
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = status;
      }

      order.updatedAt = Date.now();
      await order.save();

      return res
        .status(200)
        .json({ success: true, message: "Order updated successfully", order });
    }

    return res.status(403).json({ success: false, message: "Invalid role" });
  } catch (error) {
    console.error("orderStatusUpdate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};
