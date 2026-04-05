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

const CATEGORY_FIELDS = {
  Fashion: ["size"],
  Footwear: ["size"],
  Electronics: ["ram", "storage"],
};

const buildVariantKey = (productType, payload = {}, hasVariants = false) => {
  if (!hasVariants) return "default";

  if (payload?.variant) {
    return String(payload.variant).trim() || "default";
  }

  const fields = CATEGORY_FIELDS[productType] || [];
  const kvPairs = [];

  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new Error(`${field} is required for ${productType} when variants are available`);
    }
    kvPairs.push(`${field}:${payload[field]}`);
  }

  return kvPairs.length ? kvPairs.sort().join("|") : "default";
};

const hasProductVariants = (productType, product) => {
  if (!product) return false;

  switch (productType) {
    case "Fashion":
    case "Footwear":
      return Array.isArray(product.sizes) && product.sizes.length > 0;
    case "Electronics":
      return (
        (Array.isArray(product.rams) && product.rams.length > 0) ||
        (Array.isArray(product.storage) && product.storage.length > 0)
      );
    default:
      return false;
  }
};

const computeOrderDetailsFromItems = async (
  userId,
  rawItems = [],
  couponCode = "",
  walletInput = 0,
) => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error("No items selected for checkout");
  }

  let subtotalAmount = 0;
  const orderItems = [];

  for (const item of rawItems) {
    const Model = productModels[item?.productType];
    if (!Model) {
      throw new Error(`Invalid product type: ${item?.productType}`);
    }

    const product = await Model.findById(item?.productId);
    if (!product) {
      throw new Error(`Product not found: ${item?.productId}`);
    }

    const price = Number(product.discountedPrice);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid or missing discountedPrice for product: ${item?.productId}`);
    }

    const quantity = Number(item?.quantity || 0);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error("Invalid quantity selected");
    }

    if (Number(product.inStock || 0) < quantity) {
      throw new Error(`${product.name} does not have enough stock`);
    }

    const variant = buildVariantKey(
      item.productType,
      item,
      hasProductVariants(item.productType, product),
    );
    const subtotal = price * quantity;

    subtotalAmount += subtotal;
    orderItems.push({
      productId: item.productId,
      vendorId: product.vendorId,
      productType: item.productType,
      productName: product.name || "",
      variant,
      quantity,
      price,
      subtotal,
    });
  }

  if (subtotalAmount === 0 || orderItems.length === 0) {
    throw new Error("No valid items selected for checkout");
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
          : sanitizeCurrencyAmount(walletRequest.amount),
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
    cart: null,
    user,
    isBuyNowCheckout: true,
  };
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

const buildInvoiceHtml = (order) => {
  const couponDiscountAmount = Number(order?.discountAmount || 0);
  const walletAppliedAmount = Number(order?.walletApplied?.amountUsed || 0);
  const itemsMarkup = (order?.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.productName || item.productType}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.variant || "Default"}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;">${Number(item.quantity || 0)}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">Rs ${Number(item.price || 0).toLocaleString("en-IN")}</td>
          <td style="padding:12px;border-bottom:1px solid #e2e8f0;text-align:right;">Rs ${Number(item.subtotal || 0).toLocaleString("en-IN")}</td>
        </tr>
      `,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice ${order.orderId}</title>
  </head>
  <body style="font-family:Arial,sans-serif;padding:32px;color:#0f172a;background:#ffffff;">
    <div style="max-width:900px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;">
        <div>
          <p style="letter-spacing:0.3em;font-size:12px;color:#64748b;margin:0;">CLASSYSHOP</p>
          <h1 style="margin:12px 0 0;font-size:32px;">Tax Invoice</h1>
          <p style="margin:8px 0 0;color:#475569;">Order #${order.orderId}</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;color:#475569;">Date</p>
          <p style="margin:8px 0 0;font-weight:700;">${new Date(order.createdAt).toLocaleString("en-IN")}</p>
          <p style="margin:16px 0 0;color:#475569;">Payment</p>
          <p style="margin:8px 0 0;font-weight:700;">${formatStatusLabel(order.paymentStatus)}</p>
        </div>
      </div>
      <div style="margin-top:28px;padding:20px;border:1px solid #e2e8f0;border-radius:20px;">
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.2em;color:#64748b;">BILL TO</p>
        <p style="margin:0;font-weight:700;">${order.shippingAddress?.fullName || "Customer"}</p>
        <p style="margin:8px 0 0;color:#475569;">${[
          order.shippingAddress?.addressLine1,
          order.shippingAddress?.village,
          order.shippingAddress?.city,
          order.shippingAddress?.district,
          order.shippingAddress?.state,
          order.shippingAddress?.postalCode,
          order.shippingAddress?.country,
        ]
          .filter(Boolean)
          .join(", ")}</p>
        <p style="margin:8px 0 0;color:#475569;">Phone: ${order.shippingAddress?.phone || "N/A"}</p>
      </div>
      <table style="width:100%;margin-top:28px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:12px;text-align:left;">Item</th>
            <th style="padding:12px;text-align:left;">Variant</th>
            <th style="padding:12px;text-align:center;">Qty</th>
            <th style="padding:12px;text-align:right;">Price</th>
            <th style="padding:12px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsMarkup}</tbody>
      </table>
      <div style="margin-top:28px;display:flex;justify-content:flex-end;">
        <div style="width:320px;">
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <span>Subtotal</span>
            <strong>Rs ${Number(order.subtotalAmount || order.totalAmount || 0).toLocaleString("en-IN")}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <span>Coupon Discount</span>
            <strong>- Rs ${couponDiscountAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <span>Wallet Applied</span>
            <strong>- Rs ${walletAppliedAmount.toLocaleString("en-IN")}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:14px 0;font-size:20px;">
            <span>Total</span>
            <strong>Rs ${Number(order.totalAmount || 0).toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
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

const stopDeliveryTracking = (_order) => {};

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
  const appliedAdjustments = [];

  for (const item of items) {
    const Model = productModels[item.productType];
    if (!Model) continue;

    const quantity = Number(item.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    if (direction === "increase") {
      await Model.findByIdAndUpdate(item.productId, {
        $inc: { inStock: quantity },
      });
      continue;
    }

    const reserveResult = await Model.updateOne(
      {
        _id: item.productId,
        inStock: { $gte: quantity },
      },
      {
        $inc: { inStock: -quantity },
      },
    );

    if (!reserveResult?.modifiedCount) {
      for (const applied of appliedAdjustments.reverse()) {
        const AppliedModel = productModels[applied.productType];
        if (!AppliedModel) continue;

        await AppliedModel.findByIdAndUpdate(applied.productId, {
          $inc: { inStock: applied.quantity },
        });
      }

      throw new Error(`${item.productName || item.productType} does not have enough stock`);
    }

    appliedAdjustments.push({
      productId: item.productId,
      productType: item.productType,
      quantity,
    });
  }
};

const findExistingPaidOrderForRazorpay = async ({
  razorpayOrderId,
  razorpayPaymentId,
  orderId,
}) => {
  const filters = [];

  if (razorpayOrderId) {
    filters.push({ razorpayOrderId });
  }

  if (razorpayPaymentId) {
    filters.push({ razorpayPaymentId });
  }

  if (orderId) {
    filters.push({ orderId });
  }

  if (!filters.length) return null;

  return Order.findOne({
    $or: filters,
    paymentStatus: "completed",
  });
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
    isBuyNowCheckout: false,
  };
};

export const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, couponCode, useWallet, walletAmount, items } =
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
      isBuyNowCheckout,
    } = Array.isArray(items) && items.length
      ? await computeOrderDetailsFromItems(userId, items, couponCode, requestedWalletValue)
      : await computeOrderDetailsFromCart(userId, couponCode, requestedWalletValue);
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
      if (!isBuyNowCheckout && cart) {
        cart.items = [];
        await cart.save();
      }
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
          items: isBuyNowCheckout ? JSON.stringify(items) : "",
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

    const existingCompletedOrder = await findExistingPaidOrderForRazorpay({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      orderId: rzOrder.receipt,
    });

    if (existingCompletedOrder) {
      return res.status(200).json({
        success: true,
        message: "Payment already confirmed",
        order: existingCompletedOrder,
      });
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
      isBuyNowCheckout,
    } =
      notes.items && String(notes.items).trim()
        ? await computeOrderDetailsFromItems(
            userId,
            JSON.parse(notes.items),
            notes.couponCode,
            notes.walletAmount || 0,
          )
        : await computeOrderDetailsFromCart(
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
    try {
      await order.save();
    } catch (saveError) {
      if (saveError?.code === 11000) {
        const duplicateOrder = await findExistingPaidOrderForRazorpay({
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          orderId,
        });

        if (duplicateOrder) {
          return res.status(200).json({
            success: true,
            message: "Payment already confirmed",
            order: duplicateOrder,
          });
        }
      }

      throw saveError;
    }
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
    if (!isBuyNowCheckout && cart) {
      cart.items = [];
      await cart.save();
    }
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
    const selectedItems = Array.isArray(req.body?.items) ? req.body.items : [];
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
    } = selectedItems.length
      ? await computeOrderDetailsFromItems(
          req.id,
          selectedItems,
          couponCode,
          requestedWalletValue,
        )
      : await computeOrderDetailsFromCart(req.id, couponCode, requestedWalletValue);

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

export const downloadUserInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (String(order.userId) !== String(req.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this invoice",
      });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${order.orderId}.html"`,
    );

    return res.status(200).send(buildInvoiceHtml(order));
  } catch (error) {
    console.error("downloadUserInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download invoice",
    });
  }
};

export const downloadVendorInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${order.orderId}.html"`,
    );

    return res.status(200).send(buildInvoiceHtml(order));
  } catch (error) {
    console.error("downloadVendorInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download invoice",
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

export const markUserNotificationsAsRead = async (req, res) => {
  try {
    await UserNotification.updateMany(
      {
        userId: req.id,
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
