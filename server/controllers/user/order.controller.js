import Razorpay from "razorpay";
import crypto from "crypto";
import { Cart } from "../../models/user/cart.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronics from "../../models/vendor/electronic/electronic.model.js";
import Bag from "../../models/vendor/bag/bag.model.js";
import Footwear from "../../models/vendor/footwear/footwear.model.js";
import Grocery from "../../models/vendor/grocery/grocery.model.js";
import Beauty from "../../models/vendor/beauty/beauty.model.js";
import Wellness from "../../models/vendor/wellness/wellness.model.js";
import Jewellery from "../../models/vendor/jewellery/jewellery.model.js";
import Order from "../../models/user/order.model.js";
import { User } from "../../models/user/user.model.js";
import { VendorNotification } from "../../models/vendor/vendorNotification.model.js";
import { UserNotification } from "../../models/user/userNotification.model.js";
import { Coupon } from "../../models/marketing/coupon.model.js";
import { DeliveryPartner } from "../../models/delivery/deliveryPartner.model.js";
import { DeliveryNotification } from "../../models/delivery/deliveryNotification.model.js";
import {
  emitDeliveryDashboardUpdate,
  emitDeliveryNotificationUpdate,
  emitOrderDestinationUpdated,
  emitUserNotificationUpdate,
  emitVendorDashboardUpdate,
  emitVendorNotificationUpdate,
} from "../../socket/socket.js";
import {
  sendDeliveryCompletionOtpEmail,
  sendOrderDeliveredEmail,
  sendOrderOutForDeliveryEmail,
  sendOrderPlacedEmail,
} from "../../utils/emailService.js";
import {
  ensureOrderShippingLocation,
  geocodeShippingAddress,
} from "../../utils/geocoding.js";
import {
  creditWallet,
  debitWallet,
  ensureUserBenefits,
} from "../../utils/userBenefits.js";

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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

const RETURN_POLICY_DAYS = 10;
const RETURN_POLICY_WINDOW_MS =
  RETURN_POLICY_DAYS * 24 * 60 * 60 * 1000;
const INDIA_BOUNDS = {
  minLatitude: 6,
  maxLatitude: 38.5,
  minLongitude: 68,
  maxLongitude: 98,
};

const formatStatusLabel = (status) =>
  status
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const maskEmail = (email) => {
  const normalized = String(email || "").trim();
  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) return "";

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }

  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
};

const createOtpHash = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const sanitizeCustomerGeo = (value, { min = -Infinity, max = Infinity } = {}) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric < min || numeric > max) return null;
  return numeric;
};

const isWithinIndiaBounds = (location) =>
  location?.latitude !== null &&
  location?.latitude !== undefined &&
  location?.longitude !== null &&
  location?.longitude !== undefined &&
  Number(location.latitude) >= INDIA_BOUNDS.minLatitude &&
  Number(location.latitude) <= INDIA_BOUNDS.maxLatitude &&
  Number(location.longitude) >= INDIA_BOUNDS.minLongitude &&
  Number(location.longitude) <= INDIA_BOUNDS.maxLongitude;

const isIndiaOrder = (order) =>
  String(order?.shippingAddress?.country || "")
    .trim()
    .toLowerCase()
    .includes("india");

const clearDeliveryConfirmation = (order, verifiedAt = null) => {
  order.deliveryConfirmation = {
    purpose: "",
    otpHash: "",
    otpExpireAt: 0,
    otpSentAt: null,
    otpVerifiedAt: verifiedAt,
  };
};

const getOtpPurposeForOrder = (order) => {
  if (order?.orderStatus === "return_approved") {
    return "return";
  }

  return "delivery";
};

const stopDeliveryTracking = (order) => {
  if (!order) return;

  order.deliveryTracking = order.deliveryTracking || {};
  order.deliveryTracking.isLive = false;
  order.deliveryTracking.stoppedAt = new Date();
};

const appendStatusHistoryEntry = (
  order,
  { from = "", to, by, role = "system", reason = "", at = new Date() }
) => {
  if (!order || !to) return;

  order.statusHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory
    : [];

  order.statusHistory.push({
    from,
    to,
    by,
    role,
    reason,
    at,
  });
};

const getDeliveredAtForReturnPolicy = (order) => {
  if (!order) return null;

  const deliveredEntry = [...(order.statusHistory || [])]
    .filter((entry) => entry?.to === "delivered" && entry?.at)
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))[0];

  const candidates = [
    deliveredEntry?.at,
    order.deliveryConfirmation?.otpVerifiedAt,
    order.orderStatus === "delivered" ? order.updatedAt : null,
  ].filter(Boolean);

  const firstValidDate = candidates.find((value) => {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  });

  return firstValidDate ? new Date(firstValidDate) : null;
};

const getReturnPolicyWindow = (order, now = Date.now()) => {
  const deliveredAt = getDeliveredAtForReturnPolicy(order);
  if (!deliveredAt) {
    return {
      deliveredAt: null,
      expiresAt: null,
      remainingMs: 0,
      isEligible: false,
    };
  }

  const expiresAt = new Date(deliveredAt.getTime() + RETURN_POLICY_WINDOW_MS);
  const remainingMs = expiresAt.getTime() - Number(now);

  return {
    deliveredAt,
    expiresAt,
    remainingMs,
    isEligible: remainingMs >= 0,
  };
};

const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();
const sanitizeCurrencyAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
};

const normalizeWalletRequest = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return { enabled: true, amount: null };
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { enabled: false, amount: 0 };
  }

  return { enabled: true, amount: Math.round(numeric) };
};

const calculateCouponDiscount = (coupon, subtotalAmount) => {
  if (!coupon || subtotalAmount <= 0) return 0;

  const rawDiscount =
    coupon.discountType === "percentage"
      ? (subtotalAmount * Number(coupon.discountValue || 0)) / 100
      : Number(coupon.discountValue || 0);

  const cappedDiscount = coupon.maxDiscountAmount
    ? Math.min(rawDiscount, Number(coupon.maxDiscountAmount))
    : rawDiscount;

  return Math.max(0, Math.min(subtotalAmount, Math.round(cappedDiscount)));
};

const resolveCouponForOrder = async ({ code, subtotalAmount }) => {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { appliedCoupon: null, discountAmount: 0 };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode }).lean();
  if (!coupon) {
    throw new Error("Coupon code not found");
  }

  if (!coupon.isActive) {
    throw new Error("This coupon is currently inactive");
  }

  const now = Date.now();
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    throw new Error("This coupon is not active yet");
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    throw new Error("This coupon has expired");
  }

  if (
    coupon.usageLimit !== null &&
    coupon.usageLimit !== undefined &&
    Number(coupon.usedCount || 0) >= Number(coupon.usageLimit)
  ) {
    throw new Error("This coupon has reached its usage limit");
  }

  if (subtotalAmount < Number(coupon.minOrderAmount || 0)) {
    throw new Error(
      `Coupon requires a minimum order of Rs ${Number(
        coupon.minOrderAmount || 0
      ).toLocaleString()}`
    );
  }

  const discountAmount = calculateCouponDiscount(coupon, subtotalAmount);
  if (discountAmount <= 0) {
    throw new Error("This coupon does not apply to your cart");
  }

  return {
    appliedCoupon: {
      couponId: coupon._id,
      code: coupon.code,
      title: coupon.title,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    },
    discountAmount,
  };
};

const incrementCouponUsage = async (appliedCoupon) => {
  if (!appliedCoupon?.couponId) return;

  await Coupon.findByIdAndUpdate(appliedCoupon.couponId, {
    $inc: { usedCount: 1 },
  });
};

const debitWalletForOrder = async ({ userId, orderId, amount }) => {
  const walletAmount = sanitizeCurrencyAmount(amount);
  if (!walletAmount) return 0;

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found for wallet payment");
  }

  await ensureUserBenefits(user);
  debitWallet(user, {
    amount: walletAmount,
    source: "order_payment",
    title: "Wallet used on checkout",
    description: `Applied to order ${orderId}`,
  });
  await user.save();
  return walletAmount;
};

const refundWalletForOrder = async (order, title, description) => {
  const walletAmount = sanitizeCurrencyAmount(order?.walletApplied?.amountUsed);
  if (!order || !walletAmount || order?.walletApplied?.isRefunded) {
    return 0;
  }

  const user = await User.findById(order.userId);
  if (!user) {
    return 0;
  }

  await ensureUserBenefits(user);
  creditWallet(user, {
    amount: walletAmount,
    source: "order_refund",
    title,
    description,
    orderId: order._id,
  });
  await user.save();

  order.walletApplied = {
    amountUsed: walletAmount,
    refundedAmount: walletAmount,
    isRefunded: true,
    appliedAt: order.walletApplied?.appliedAt || order.createdAt || new Date(),
    refundedAt: new Date(),
  };

  return walletAmount;
};

const normalizeOrderStatus = (status) => {
  const rawStatus =
    typeof status === "object" && status !== null
      ? status.value || status.status || status.label || ""
      : status;

  const normalized = String(rawStatus || "")
    .trim()
    .toLowerCase();

  if (/out[\s_-]*for[\s_-]*delivery/.test(normalized)) {
    return "out_for_delivery";
  }

  if (/return[\s_-]*requested/.test(normalized)) {
    return "return_requested";
  }

  if (/return[\s_-]*approved/.test(normalized)) {
    return "return_approved";
  }

  if (/return[\s_-]*rejected/.test(normalized)) {
    return "return_rejected";
  }

  if (/return[\s_-]*completed/.test(normalized)) {
    return "return_completed";
  }

  return normalized.replace(/[\s-]+/g, "_");
};

const productRouteMap = {
  Fashion: "fashion",
  Electronics: "electronics",
  Bag: "bag",
  Footwear: "footwear",
  Grocery: "grocery",
  Beauty: "beauty",
  Wellness: "wellness",
  Jewellery: "jewellery",
};

const getProductLink = (productType, productId) => {
  const routeBase = productRouteMap[productType];
  const storefrontBase = (process.env.USER_URL || "").replace(/\/$/, "");

  if (!routeBase || !storefrontBase || !productId) return "";

  return `${storefrontBase}/${routeBase}/${routeBase}-product-details/${productId}`;
};

const buildOrderEmailItems = async (items = []) => {
  const emailItems = await Promise.all(
    (items || []).map(async (item) => {
      try {
        const Model = productModels[item.productType];
        const product = Model
          ? await Model.findById(item.productId).lean()
          : null;

        return {
          name: item.productName || product?.name || item.productType,
          category: item.productType,
          variant: item.variant || "",
          quantity: item.quantity,
          price: item.price,
          image: product?.image?.[0] || "",
          link: getProductLink(item.productType, item.productId),
        };
      } catch (error) {
        console.error("Failed to build order email item:", error);
        return {
          name: item.productName || item.productType,
          category: item.productType,
          variant: item.variant || "",
          quantity: item.quantity,
          price: item.price,
          image: "",
          link: getProductLink(item.productType, item.productId),
        };
      }
    }),
  );

  return emailItems.filter(Boolean);
};

const safelySendOrderPlacedEmail = async ({ order, user }) => {
  if (!order || !user?.email) return;

  try {
    const items = await buildOrderEmailItems(order.items);
    await sendOrderPlacedEmail({
      to: user.email,
      name: user.name,
      orderId: order.orderId,
      paymentMethod: order.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay",
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      items,
    });
  } catch (error) {
    console.error("Failed to send order confirmation email:", error);
  }
};

const safelySendOutForDeliveryEmail = async ({ order }) => {
  if (!order?.userId) return;

  try {
    const user = await User.findById(order.userId).select("name email").lean();
    if (!user?.email) return;

    const items = await buildOrderEmailItems(order.items);
    await sendOrderOutForDeliveryEmail({
      to: user.email,
      name: user.name,
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      items,
    });
  } catch (error) {
    console.error("Failed to send out-for-delivery email:", error);
  }
};

const safelySendDeliveredEmail = async ({ order }) => {
  if (!order?.userId) return;

  try {
    const user = await User.findById(order.userId).select("name email").lean();
    if (!user?.email) return;

    const items = await buildOrderEmailItems(order.items);
    await sendOrderDeliveredEmail({
      to: user.email,
      name: user.name,
      orderId: order.orderId,
      totalAmount: order.totalAmount,
      items,
    });
  } catch (error) {
    console.error("Failed to send delivered email:", error);
  }
};

const adjustInventoryForOrderItems = async (
  items,
  direction = "decrease"
) => {
  for (const item of items) {
    const Model = productModels[item.productType];
    if (!Model) continue;

    const delta = direction === "increase" ? Number(item.quantity) : -Number(item.quantity);
    await Model.findByIdAndUpdate(item.productId, {
      $inc: { inStock: delta },
    });
  }
};

const createVendorNotificationsForOrder = async (order, userId) => {
  const orderingUser = await User.findById(userId).select("name email").lean();
  const userLabel = orderingUser?.name || orderingUser?.email || "A customer";

  const grouped = new Map();
  for (const item of order.items || []) {
    const key = String(item.vendorId);
    const current = grouped.get(key) || [];
    current.push(item);
    grouped.set(key, current);
  }

  const notifications = Array.from(grouped.entries()).map(([vendorId, items]) => {
    const itemSummary = items
      .slice(0, 2)
      .map((item) => item.productName || item.productType)
      .join(", ");
    const extraCount = Math.max(items.length - 2, 0);

    return {
      vendorId,
      userId,
      orderId: order._id,
      type: "order",
      title: "New order received",
      message: `${userLabel} placed order ${order.orderId} for ${
        items.length
      } item(s)${itemSummary ? `: ${itemSummary}` : ""}${
        extraCount ? ` +${extraCount} more` : ""
      }.`,
    };
  });

  if (notifications.length) {
    await VendorNotification.insertMany(notifications);
    notifications.forEach((notification) => {
      emitVendorNotificationUpdate(notification.vendorId);
      emitVendorDashboardUpdate(notification.vendorId);
    });
  }
};

const createUserNotificationForOrderStatus = async ({
  order,
  status,
  reason,
  previousStatus,
  vendorId,
}) => {
  if (!order?.userId || previousStatus === status) return;

  const previewItems = (order.items || [])
    .slice(0, 2)
    .map((item) => item.productName || item.productType)
    .filter(Boolean)
    .join(", ");
  const extraCount = Math.max((order.items || []).length - 2, 0);

  await UserNotification.create({
    userId: order.userId,
    vendorId,
    orderId: order._id,
    type: "order_status",
    status,
    title: `Order ${formatStatusLabel(status)}`,
    message: `Your order ${order.orderId} is now ${formatStatusLabel(
      status
    )}.${previewItems ? ` Items: ${previewItems}` : ""}${
      extraCount ? ` +${extraCount} more.` : ""
    }${reason ? ` Note: ${reason}` : ""}`,
  });

  emitUserNotificationUpdate(order.userId);
};

const createDeliveryNotificationForOrder = async ({
  order,
  type = "system",
  title,
  message,
}) => {
  if (!order?.assignedDeliveryPartner || !title || !message) return;

  await DeliveryNotification.create({
    deliveryPartnerId: order.assignedDeliveryPartner,
    orderId: order._id,
    type,
    title,
    message,
  });

  emitDeliveryNotificationUpdate(order.assignedDeliveryPartner);
  emitDeliveryDashboardUpdate(order.assignedDeliveryPartner);
};

const computeOrderDetailsFromCart = async (
  userId,
  couponCode = "",
  walletInput = 0
) => {
  const cart = await Cart.findOne({ userId });
  if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }
  let subtotalAmount = 0;
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
      if (Number(product.inStock || 0) < Number(qty)) {
        throw new Error(`${product.name} does not have enough stock`);
      }
      const subtotal = price * qty;
      subtotalAmount += subtotal;
      orderItems.push({
        productId: item.productId,
        vendorId: product.vendorId,
        productType: item.productType,
        productName: product.name || "",
        variant: variant.variant,
        quantity: qty,
        price,
        subtotal,
      });
    }
  }
  if (subtotalAmount === 0 || orderItems.length === 0) {
    throw new Error("No valid items in cart");
  }

  const { appliedCoupon, discountAmount } = await resolveCouponForOrder({
    code: couponCode,
    subtotalAmount,
  });
  const user = await User.findById(userId).select("wallet referral");
  if (!user) {
    throw new Error("User not found");
  }
  await ensureUserBenefits(user);
  await user.save();

  const walletRequest = normalizeWalletRequest(walletInput);
  const discountedTotal = Math.max(0, subtotalAmount - discountAmount);
  const availableWalletBalance = sanitizeCurrencyAmount(user.wallet?.balance);
  const walletAmountUsed = walletRequest.enabled
    ? Math.min(
        discountedTotal,
        availableWalletBalance,
        walletRequest.amount === null
          ? discountedTotal
          : sanitizeCurrencyAmount(walletRequest.amount)
      )
    : 0;
  const totalAmount = Math.max(0, discountedTotal - walletAmountUsed);

  return {
    subtotalAmount,
    discountAmount,
    walletAmountUsed,
    availableWalletBalance,
    totalAmount,
    appliedCoupon,
    orderItems,
    cart,
    user,
  };
};

export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, couponCode, useWallet, walletAmount } =
      req.body;
    const userId = req.id;
    const orderingUser = await User.findById(userId).select("name email").lean();
    if (!shippingAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and payment method are required",
      });
    }
    if (!["razorpay", "cod", "wallet"].includes(paymentMethod)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment method" });
    }
    const requestedWalletValue =
      useWallet === undefined ? walletAmount : useWallet ? walletAmount || true : 0;
    const {
      subtotalAmount,
      discountAmount,
      walletAmountUsed,
      totalAmount,
      appliedCoupon,
      orderItems,
      cart,
    } = await computeOrderDetailsFromCart(userId, couponCode, requestedWalletValue);
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    const geocodedShippingAddress = await geocodeShippingAddress(shippingAddress);
    const effectivePaymentMethod =
      totalAmount === 0 && walletAmountUsed > 0 ? "wallet" : paymentMethod;

    if (effectivePaymentMethod === "wallet" || effectivePaymentMethod === "cod") {
      const order = new Order({
        userId,
        items: orderItems,
        totalAmount,
        subtotalAmount,
        discountAmount,
        coupon: appliedCoupon || undefined,
        walletApplied: walletAmountUsed
          ? {
              amountUsed: walletAmountUsed,
              appliedAt: new Date(),
            }
          : undefined,
        shippingAddress: geocodedShippingAddress,
        paymentMethod: effectivePaymentMethod,
        paymentStatus: effectivePaymentMethod === "wallet" ? "completed" : "pending",
        orderStatus: effectivePaymentMethod === "wallet" ? "processing" : "pending",
        orderId,
      });
      appendStatusHistoryEntry(order, {
        to: effectivePaymentMethod === "wallet" ? "processing" : "pending",
        role: "system",
        reason:
          effectivePaymentMethod === "wallet"
            ? "Order paid fully using wallet balance"
            : "Order placed with Cash on Delivery",
      });
      await order.save();
      if (walletAmountUsed) {
        await debitWalletForOrder({
          userId,
          orderId: order.orderId,
          amount: walletAmountUsed,
        });
      }
      await adjustInventoryForOrderItems(order.items, "decrease");
      order.stockAdjusted = true;
      order.stockRestored = false;
      await order.save();
      await incrementCouponUsage(appliedCoupon);
      await createVendorNotificationsForOrder(order, userId);
      Array.from(new Set(order.items.map((item) => String(item.vendorId)))).forEach(
        (vendorId) => emitVendorDashboardUpdate(vendorId)
      );
      cart.items = [];
      await cart.save();
      // Order response ko email latency se block nahi karte; post-checkout
      // UI should redirect instantly while mail sends in background.
      void safelySendOrderPlacedEmail({ order, user: orderingUser });
      return res
        .status(201)
        .json({ success: true, message: "Order created successfully", order });
    } else {
      if (totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Wallet already covers this order. Please place it directly.",
        });
      }

      const options = {
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: orderId,
        notes: {
          userId: userId.toString(),
          shippingAddress: JSON.stringify(geocodedShippingAddress),
          couponCode: normalizeCouponCode(couponCode),
          walletAmount: String(walletAmountUsed || 0),
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
      message: /coupon|cart|stock|invalid|required|not found/i.test(
        error.message || ""
      )
        ? error.message
        : "Failed to create order",
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
    const orderingUser = await User.findById(userId).select("name email").lean();
    const shippingAddress = await geocodeShippingAddress(
      JSON.parse(notes.shippingAddress)
    );
    const {
      subtotalAmount,
      discountAmount,
      walletAmountUsed,
      totalAmount,
      appliedCoupon,
      orderItems,
      cart,
    } = await computeOrderDetailsFromCart(
      userId,
      notes.couponCode,
      notes.walletAmount || 0
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
      subtotalAmount,
      discountAmount,
      coupon: appliedCoupon || undefined,
      walletApplied: walletAmountUsed
        ? {
            amountUsed: walletAmountUsed,
            appliedAt: new Date(),
          }
        : undefined,
      shippingAddress,
      paymentMethod: "razorpay",
      paymentStatus: "completed",
      orderStatus: "processing",
      orderId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });
    appendStatusHistoryEntry(order, {
      to: "processing",
      role: "system",
      reason: "Payment confirmed via Razorpay",
    });
    await order.save();
    if (walletAmountUsed) {
      await debitWalletForOrder({
        userId,
        orderId: order.orderId,
        amount: walletAmountUsed,
      });
    }
    await adjustInventoryForOrderItems(order.items, "decrease");
    order.stockAdjusted = true;
    order.stockRestored = false;
    await order.save();
    await incrementCouponUsage(appliedCoupon);
    await createVendorNotificationsForOrder(order, userId);
    cart.items = [];
    await cart.save();
    // Payment success response ko email latency se block nahi karte; the
    // order is already committed and cart is cleared before this fires.
    void safelySendOrderPlacedEmail({ order, user: orderingUser });
    return res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: /coupon|cart|stock|invalid|required|not found/i.test(
        error.message || ""
      )
        ? error.message
        : "Failed to confirm payment",
      error: error.message,
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const couponCode = normalizeCouponCode(req.body?.code);
    const requestedWalletValue =
      req.body?.useWallet === undefined
        ? req.body?.walletAmount
        : req.body?.useWallet
          ? req.body?.walletAmount || true
          : 0;

    const {
      subtotalAmount,
      discountAmount,
      walletAmountUsed,
      availableWalletBalance,
      totalAmount,
      appliedCoupon,
    } = await computeOrderDetailsFromCart(req.id, couponCode, requestedWalletValue);

    return res.status(200).json({
      success: true,
      message: couponCode
        ? "Pricing updated successfully"
        : "Wallet pricing updated successfully",
      subtotalAmount,
      discountAmount,
      walletAmountUsed,
      availableWalletBalance,
      totalAmount,
      coupon: appliedCoupon,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to validate coupon",
    });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.id;
    const orders = await Order.find({ userId })
      .populate(
        "assignedDeliveryPartner",
        "name email phone vehicleType isAvailable isOnline lastSeenAt"
      )
      .sort({ createdAt: -1 });

    await ensureOrdersHaveShippingLocations(orders);

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
    const orders = await Order.find()
      .populate(
        "assignedDeliveryPartner",
        "name email phone vehicleType isAvailable isOnline lastSeenAt"
      )
      .sort({ createdAt: -1 });

    await ensureOrdersHaveShippingLocations(orders);

    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const detailedItems = await Promise.all(
          (order.items || []).map(async (item) => {
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
    console.error("getVendorOrders error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get orders" });
  }
};

export const updateCustomerDeliveryLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const latitude = sanitizeCustomerGeo(req.body?.latitude, {
      min: -90,
      max: 90,
    });
    const longitude = sanitizeCustomerGeo(req.body?.longitude, {
      min: -180,
      max: 180,
    });
    const accuracy = sanitizeCustomerGeo(req.body?.accuracy, { min: 0 });

    if (latitude === null || longitude === null) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude and longitude are required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.userId) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to update this order location",
      });
    }

    if (["delivered", "cancelled", "return_completed", "return_rejected"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "This order no longer accepts customer live location updates",
      });
    }

    if (
      isIndiaOrder(order) &&
      !isWithinIndiaBounds({ latitude, longitude })
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current location India ke bahar detect ho rahi hai. Browser location settings check karke phir try karo.",
      });
    }

    order.customerLiveLocation = {
      latitude,
      longitude,
      accuracy,
      label:
        String(req.body?.label || "").trim() || "Customer live location",
      source: "customer_live",
      updatedAt: new Date(),
    };
    order.updatedAt = Date.now();
    await order.save();

    emitOrderDestinationUpdated(order);

    return res.status(200).json({
      success: true,
      message: "Customer live location updated successfully",
      order,
      destination: order.customerLiveLocation,
    });
  } catch (error) {
    console.error("updateCustomerDeliveryLocation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update customer live location",
    });
  }
};

export const sendDeliveryCompletionOtp = async (req, res) => {
  try {
    if (req.role !== "delivery") {
      return res.status(403).json({
        success: false,
        message: "Only delivery partners can request delivery OTP",
      });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      !order.assignedDeliveryPartner ||
      order.assignedDeliveryPartner.toString() !== req.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This order is not assigned to you",
      });
    }

    const otpPurpose = getOtpPurposeForOrder(order);
    const canSendOtp = ["out_for_delivery", "return_approved"].includes(
      order.orderStatus
    );

    if (!canSendOtp) {
      return res.status(400).json({
        success: false,
        message:
          "OTP can only be sent when order is out for delivery or approved for return pickup",
      });
    }

    const user = await User.findById(order.userId).select("name email").lean();
    if (!user?.email) {
      return res.status(400).json({
        success: false,
        message: "Customer email is not available for this order",
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpireAt = Date.now() + 10 * 60 * 1000;

    await sendDeliveryCompletionOtpEmail({
      to: user.email,
      name: user.name,
      orderId: order.orderId,
      otp,
      purpose: otpPurpose,
    });

    order.deliveryConfirmation = {
      purpose: otpPurpose,
      otpHash: createOtpHash(otp),
      otpExpireAt,
      otpSentAt: new Date(),
      otpVerifiedAt: null,
    };
    order.updatedAt = Date.now();
    await order.save();

    return res.status(200).json({
      success: true,
      message:
        otpPurpose === "return"
          ? "Return pickup OTP sent to customer email"
          : "Delivery OTP sent to customer email",
      deliveryConfirmation: {
        purpose: otpPurpose,
        sentTo: maskEmail(user.email),
        otpSentAt: order.deliveryConfirmation.otpSentAt,
        otpExpireAt,
      },
    });
  } catch (error) {
    console.error("sendDeliveryCompletionOtp error:", error);
    return res.status(500).json({
      success: false,
      message:
        error?.message ===
        "Email is not configured. Please set RESEND_API_KEY and SENDER_EMAIL."
          ? error.message
          : "Failed to send delivery OTP",
    });
  }
};

export const verifyDeliveryCompletionOtp = async (req, res) => {
  try {
    if (req.role !== "delivery") {
      return res.status(403).json({
        success: false,
        message: "Only delivery partners can verify delivery OTP",
      });
    }

    const otp = String(req.body?.otp || "").trim();
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (
      !order.assignedDeliveryPartner ||
      order.assignedDeliveryPartner.toString() !== req.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This order is not assigned to you",
      });
    }

    const otpPurpose = getOtpPurposeForOrder(order);
    const expectedStatus =
      otpPurpose === "return" ? "return_approved" : "out_for_delivery";

    if (order.orderStatus !== expectedStatus) {
      return res.status(400).json({
        success: false,
        message:
          otpPurpose === "return"
            ? "Return must be approved before OTP verification"
            : "Order must be out for delivery before completion",
      });
    }

    const confirmation = order.deliveryConfirmation || {};
    if (!confirmation.otpHash || !confirmation.otpExpireAt) {
      return res.status(400).json({
        success: false,
        message:
          otpPurpose === "return"
            ? "Send return OTP first before verifying pickup"
            : "Send OTP first before verifying delivery",
      });
    }

    if ((confirmation.purpose || "delivery") !== otpPurpose) {
      clearDeliveryConfirmation(order);
      order.updatedAt = Date.now();
      await order.save();

      return res.status(400).json({
        success: false,
        message: "OTP flow changed. Please send a fresh OTP",
      });
    }

    if (Date.now() > Number(confirmation.otpExpireAt || 0)) {
      clearDeliveryConfirmation(order);
      order.updatedAt = Date.now();
      await order.save();

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please send a new OTP",
      });
    }

    if (createOtpHash(otp) !== confirmation.otpHash) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const previousStatus = order.orderStatus;
    const vendorIds = Array.from(
      new Set((order.items || []).map((item) => String(item.vendorId)).filter(Boolean))
    );

    if (otpPurpose === "return") {
      if (
        order.paymentMethod === "razorpay" &&
        order.paymentStatus === "completed"
      ) {
        order.paymentStatus = "refund";
        order.refundCompletedAt = new Date();
      }

      appendStatusHistoryEntry(order, {
        from: order.orderStatus,
        to: "return_completed",
        by: req.id,
        role: "delivery",
        reason: "Return pickup completed after OTP verification with customer",
        at: new Date(),
      });

      if (order.stockAdjusted && !order.stockRestored) {
        await adjustInventoryForOrderItems(order.items, "increase");
        order.stockRestored = true;
      }
      await refundWalletForOrder(
        order,
        "Wallet refund for completed return",
        `Refund for returned order ${order.orderId}`
      );

      order.orderStatus = "return_completed";
      stopDeliveryTracking(order);
      clearDeliveryConfirmation(order, new Date());
      order.updatedAt = Date.now();
      await order.save();
    } else {
      appendStatusHistoryEntry(order, {
        from: order.orderStatus,
        to: "delivered",
        by: req.id,
        role: "delivery",
        reason: "Delivered after OTP verification with customer",
        at: new Date(),
      });

      order.orderStatus = "delivered";
      stopDeliveryTracking(order);
      clearDeliveryConfirmation(order, new Date());
      order.returnRequest = {
        ...(order.returnRequest || {}),
        reason: "",
        requestedAt: null,
        windowEndsAt: new Date(Date.now() + RETURN_POLICY_WINDOW_MS),
      };
      order.updatedAt = Date.now();
      await order.save();
    }

    await createUserNotificationForOrderStatus({
      order,
      status: order.orderStatus,
      reason:
        otpPurpose === "return"
          ? "Return pickup verified with OTP"
          : "Delivery verified with OTP",
      previousStatus,
      vendorId: order.items?.[0]?.vendorId,
    });

    vendorIds.forEach((vendorId) => emitVendorDashboardUpdate(vendorId));
    if (otpPurpose !== "return") {
      void safelySendDeliveredEmail({ order });
    }

    return res.status(200).json({
      success: true,
      message:
        otpPurpose === "return"
          ? "Return OTP verified and pickup marked completed"
          : "Delivery OTP verified and order marked delivered",
      order,
    });
  } catch (error) {
    console.error("verifyDeliveryCompletionOtp error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify delivery OTP",
    });
  }
};

export const orderStatusUpdate = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const { orderId } = req.params;
    const normalizedStatus = normalizeOrderStatus(status);

    if (!normalizedStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "return_requested",
      "return_approved",
      "return_rejected",
      "return_completed",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
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

    const previousStatus = order.orderStatus;

    console.log(req.role);

    if (role === "user") {
      if (order.userId.toString() !== req.id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized for this order" });
      }

      // Allow user to request return only when delivered
      if (normalizedStatus === "return_requested") {
        const trimmedReason = String(reason || "").trim();

        if (order.orderStatus !== "delivered") {
          return res.status(400).json({
            success: false,
            message: "Return can only be requested after delivery",
          });
        }

        if (!trimmedReason) {
          return res.status(400).json({
            success: false,
            message: "Please add a return reason before submitting",
          });
        }

        const returnPolicy = getReturnPolicyWindow(order);
        if (!returnPolicy.deliveredAt || !returnPolicy.expiresAt) {
          return res.status(400).json({
            success: false,
            message: "Delivery time could not be verified for this order",
          });
        }

        if (!returnPolicy.isEligible) {
          return res.status(400).json({
            success: false,
            message: `Return window expired. Returns are allowed only within ${RETURN_POLICY_DAYS} days of delivery`,
          });
        }

        appendStatusHistoryEntry(order, {
          from: order.orderStatus,
          to: "return_requested",
          by: req.id,
          role: "user",
          reason: trimmedReason,
          at: new Date(),
        });

        order.orderStatus = "return_requested";
        order.returnRequest = {
          reason: trimmedReason,
          requestedAt: new Date(),
          windowEndsAt: returnPolicy.expiresAt,
        };
        order.updatedAt = Date.now();
        await order.save();

        await createDeliveryNotificationForOrder({
          order,
          type: "return",
          title: "Return Requested",
          message: `Customer requested a return for order #${order.orderId}. Reason: ${trimmedReason}. Wait for vendor approval before pickup.`,
        });

        return res.status(200).json({
          success: true,
          message: "Return requested successfully",
          order,
        });
      }

      // Allow user to cancel if order is pending or processing
      if (normalizedStatus === "cancelled") {
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

        if (order.stockAdjusted && !order.stockRestored) {
          await adjustInventoryForOrderItems(order.items, "increase");
          order.stockRestored = true;
        }
        await refundWalletForOrder(
          order,
          "Wallet refund for cancelled order",
          `Refund for cancelled order ${order.orderId}`
        );
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
        "out_for_delivery",
        "cancelled",
        "return_approved",
        "return_rejected",
      ];
      if (!vendorAllowed.includes(normalizedStatus)) {
        return res
          .status(403)
          .json({ success: false, message: "Vendors cannot set that status" });
      }

      if (order.orderStatus === "cancelled" && normalizedStatus !== "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Order already cancelled and cannot be changed",
        });
      }

      if (
        order.orderStatus === "delivered" &&
        !normalizedStatus.startsWith("return") &&
        normalizedStatus !== "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot change a delivered order to '${normalizedStatus}'`,
        });
      }

      if (normalizedStatus === "return_approved") {
        if (order.orderStatus !== "return_requested") {
          return res.status(400).json({
            success: false,
            message: "Only return_requested orders can be approved",
          });
        }
        if (!order.assignedDeliveryPartner) {
          return res.status(400).json({
            success: false,
            message:
              "Assign a delivery partner before approving return pickup",
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
        await ensureOrderShippingLocation(order);

        await createDeliveryNotificationForOrder({
          order,
          type: "return",
          title: "Return Pickup Approved",
          message: `Return pickup for order #${order.orderId} is approved. Open your dashboard to handle the pickup.`,
        });
      } else if (normalizedStatus === "return_rejected") {
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
        stopDeliveryTracking(order);
      } else if (normalizedStatus === "cancelled") {
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
        if (order.stockAdjusted && !order.stockRestored) {
          await adjustInventoryForOrderItems(order.items, "increase");
          order.stockRestored = true;
        }
        await refundWalletForOrder(
          order,
          "Wallet refund for cancelled order",
          `Refund for cancelled order ${order.orderId}`
        );
        order.orderStatus = "cancelled";
        stopDeliveryTracking(order);
      } else {
        order.statusHistory = order.statusHistory || [];
        order.statusHistory.push({
          from: order.orderStatus,
          to: normalizedStatus,
          by: req.id,
          role: "vendor",
          reason: reason || "",
          at: new Date(),
        });
        order.orderStatus = normalizedStatus;
        if (normalizedStatus === "out_for_delivery") {
          if (!order.assignedDeliveryPartner) {
            return res.status(400).json({
              success: false,
              message:
                "Assign a delivery partner before marking order out for delivery",
            });
          }
          await ensureOrderShippingLocation(order);
        }
      }

      order.updatedAt = Date.now();
      await order.save();
      await createUserNotificationForOrderStatus({
        order,
        status: order.orderStatus,
        reason,
        previousStatus,
        vendorId: req.id,
      });
      if (order.orderStatus === "out_for_delivery") {
        // Delivery reliability ke liye deployed environments me email attempt
        // ko await karte hain, lekin helper ke andar errors swallow hote hain.
        await safelySendOutForDeliveryEmail({ order });
      }
      emitVendorDashboardUpdate(req.id);

      return res
        .status(200)
        .json({ success: true, message: "Order updated successfully", order });
    }

    if (role === "delivery") {
      const deliveryPartner = await DeliveryPartner.findById(req.id).select(
        "isBlocked isAvailable"
      );

      if (!deliveryPartner || deliveryPartner.isBlocked) {
        return res.status(403).json({
          success: false,
          message: "Delivery partner not authorized",
        });
      }

      if (
        !order.assignedDeliveryPartner ||
        order.assignedDeliveryPartner.toString() !== req.id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "This order is not assigned to you",
        });
      }

      const deliveryAllowed = [
        "out_for_delivery",
        "cancelled",
        "return_completed",
        "delivered",
      ];
      if (!deliveryAllowed.includes(normalizedStatus)) {
        return res.status(403).json({
          success: false,
          message:
            "Delivery partner can only update delivery, cancellation, or return-completion statuses",
        });
      }

      if (normalizedStatus === "delivered") {
        return res.status(403).json({
          success: false,
          message: "Use delivery OTP verification flow to mark order delivered",
        });
      }

      const vendorIds = Array.from(
        new Set((order.items || []).map((item) => String(item.vendorId)).filter(Boolean))
      );

      if (
        normalizedStatus === "out_for_delivery" &&
        !["processing", "shipped", "out_for_delivery"].includes(order.orderStatus)
      ) {
        return res.status(400).json({
          success: false,
          message: "Order must be processed or shipped before delivery starts",
        });
      }

      if (
        normalizedStatus === "delivered" &&
        order.orderStatus !== "out_for_delivery"
      ) {
        return res.status(400).json({
          success: false,
          message: "Order must be out for delivery before marking delivered",
        });
      }

      if (
        normalizedStatus === "cancelled" &&
        !["processing", "shipped", "out_for_delivery"].includes(order.orderStatus)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only active delivery orders can be cancelled by the delivery partner",
        });
      }

      if (
        normalizedStatus === "return_completed" &&
        order.orderStatus !== "return_approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return pickup can only be completed after vendor approval",
        });
      }

      if (normalizedStatus === "cancelled") {
        if (
          order.paymentMethod === "razorpay" &&
          order.paymentStatus === "completed"
        ) {
          order.paymentStatus = "refund";
          order.refundRequestedAt = new Date();
        }

        appendStatusHistoryEntry(order, {
          from: order.orderStatus,
          to: "cancelled",
          by: req.id,
          role: "delivery",
          reason: reason || "Cancelled by delivery partner",
          at: new Date(),
        });

        if (order.stockAdjusted && !order.stockRestored) {
          await adjustInventoryForOrderItems(order.items, "increase");
          order.stockRestored = true;
        }
        await refundWalletForOrder(
          order,
          "Wallet refund for cancelled order",
          `Refund for cancelled order ${order.orderId}`
        );

        order.orderStatus = "cancelled";
        stopDeliveryTracking(order);
        order.updatedAt = Date.now();
        await order.save();

        await createUserNotificationForOrderStatus({
          order,
          status: order.orderStatus,
          reason: reason || "Delivery partner cancelled this order",
          previousStatus,
          vendorId: order.items?.[0]?.vendorId,
        });

        vendorIds.forEach((vendorId) => emitVendorDashboardUpdate(vendorId));

        return res.status(200).json({
          success: true,
          message: "Order cancelled successfully",
          order,
        });
      }

      if (normalizedStatus === "return_completed") {
        return res.status(403).json({
          success: false,
          message: "Use OTP verification flow to complete return pickup",
        });
      }

      appendStatusHistoryEntry(order, {
        from: order.orderStatus,
        to: normalizedStatus,
        by: req.id,
        role: "delivery",
        reason:
          reason ||
          (normalizedStatus === "delivered"
            ? "Marked delivered by delivery partner"
            : "Marked out for delivery by delivery partner"),
        at: new Date(),
      });

      order.orderStatus = normalizedStatus;
      if (normalizedStatus === "out_for_delivery") {
        await ensureOrderShippingLocation(order);
        order.deliveryTracking = order.deliveryTracking || {};
        order.deliveryTracking.isLive = false;
        order.deliveryTracking.startedAt = null;
        order.deliveryTracking.stoppedAt = new Date();
      }
      order.updatedAt = Date.now();
      await order.save();

      await createUserNotificationForOrderStatus({
        order,
        status: order.orderStatus,
        reason,
        previousStatus,
        vendorId: order.items?.[0]?.vendorId,
      });

      if (order.orderStatus === "out_for_delivery") {
        await safelySendOutForDeliveryEmail({ order });
      }

      vendorIds.forEach((vendorId) => emitVendorDashboardUpdate(vendorId));

      return res.status(200).json({
        success: true,
        message: "Delivery status updated successfully",
        order,
      });
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

export const getUserNotifications = async (req, res) => {
  try {
    const notifications = await UserNotification.find({ userId: req.id })
      .sort({ createdAt: -1 })
      .limit(50);

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

export const deleteUserNotification = async (req, res) => {
  try {
    const notification = await UserNotification.findOneAndDelete({
      _id: req.params.id,
      userId: req.id,
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

export const clearUserNotifications = async (req, res) => {
  try {
    await UserNotification.deleteMany({ userId: req.id });

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
