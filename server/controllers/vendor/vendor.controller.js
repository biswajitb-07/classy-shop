import { Vendor } from "../../models/vendor/vendor.model.js";
import { User } from "../../models/user/user.model.js";
import { Cart } from "../../models/user/cart.model.js";
import { Wishlist } from "../../models/user/wishlist.model.js";
import Order from "../../models/user/order.model.js";
import { UserNotification } from "../../models/user/userNotification.model.js";
import bcrypt from "bcryptjs";
import {
  loginSchema,
  registerSchema,
} from "../../validation/vendor/vendor.validation.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../utils/cloudinary.js";
import {
  clearVendorAuthCookies,
  signSocketToken,
  setVendorAuthCookies,
} from "../../utils/authCookies.js";
import { Category } from "../../models/vendor/category.model.js";
import { VendorNotification } from "../../models/vendor/vendorNotification.model.js";
import { SupportConversation } from "../../models/support/supportConversation.model.js";
import { SupportMessage } from "../../models/support/supportMessage.model.js";
import { ProductReview } from "../../models/user/productReview.model.js";
import { AiUserMemory } from "../../models/ai/aiUserMemory.model.js";
import { DeliveryNotification } from "../../models/delivery/deliveryNotification.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronic from "../../models/vendor/electronic/electronic.model.js";
import Bag from "../../models/vendor/bag/bag.model.js";
import Grocery from "../../models/vendor/grocery/grocery.model.js";
import Footwear from "../../models/vendor/footwear/footwear.model.js";
import Beauty from "../../models/vendor/beauty/beauty.model.js";
import Wellness from "../../models/vendor/wellness/wellness.model.js";
import Jewellery from "../../models/vendor/jewellery/jewellery.model.js";
import FashionBrand from "../../models/vendor/fashion/fashionBrand.model.js";
import ElectronicBrand from "../../models/vendor/electronic/electronicBrand.model.js";
import BagBrand from "../../models/vendor/bag/bagBrand.model.js";
import GroceryBrand from "../../models/vendor/grocery/groceryBrand.model.js";
import FootwearBrand from "../../models/vendor/footwear/footwearBrand.model.js";
import BeautyBrand from "../../models/vendor/beauty/beautyBrand.model.js";
import WellnessBrand from "../../models/vendor/wellness/wellnessBrand.model.js";
import JewelleryBrand from "../../models/vendor/jewellery/jewelleryBrand.model.js";
import { emitVendorSummaryUpdate } from "../../socket/socket.js";
import { NewsletterSubscriber } from "../../models/newsletter.model.js";
import { VendorPayout } from "../../models/vendor/vendorPayout.model.js";
import { DeliveryPartner } from "../../models/delivery/deliveryPartner.model.js";
import { Admin } from "../../models/admin/admin.model.js";
import {
  sendPasswordChangedEmail,
  sendPayoutStatusEmail,
  sendResetOtpEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";
import { emitVendorNotificationUpdate } from "../../socket/socket.js";
import mongoose from "mongoose";
import { createOtpHash } from "../../utils/security.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PAYOUT_LOCKED_STATUSES = ["pending", "approved"];
const PAYOUT_PAID_STATUSES = ["paid"];
const DELIVERED_STATUSES = ["delivered"];
const RETURNED_STATUSES = ["return_completed"];
const PENDING_REVENUE_STATUSES = ["processing", "shipped", "out_for_delivery"];

const vendorProductModels = [
  Fashion,
  Electronic,
  Bag,
  Grocery,
  Footwear,
  Beauty,
  Wellness,
  Jewellery,
];

const vendorBrandModels = [
  FashionBrand,
  ElectronicBrand,
  BagBrand,
  GroceryBrand,
  FootwearBrand,
  BeautyBrand,
  WellnessBrand,
  JewelleryBrand,
];

const extractCloudinaryPublicIdFromUrl = (url = "") => {
  if (!url || typeof url !== "string" || !url.includes("/upload/")) return "";
  const cleanedUrl = url.split("?")[0];
  const match = cleanedUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match?.[1] || "";
};

const deleteCloudinaryUrl = async (url) => {
  const publicId = extractCloudinaryPublicIdFromUrl(url);
  if (!publicId) return;
  await deleteMediaFromCloudinary(publicId);
};

const deleteCloudinaryUrls = async (urls = []) => {
  const uniqueUrls = [...new Set((urls || []).filter(Boolean))];
  await Promise.all(uniqueUrls.map((url) => deleteCloudinaryUrl(url)));
};

const formatCsvCell = (value) =>
  `"${String(value ?? "")
    .replace(/"/g, '""')
    .replace(/\r?\n/g, " ")}"`;

const getVendorOrderSnapshots = async (vendorId) => {
  const normalizedVendorId = String(vendorId || "");
  const orders = await Order.find({
    "items.vendorId": vendorId,
  })
    .sort({ createdAt: -1 })
    .lean();

  return orders
    .map((order) => {
      const vendorItems = (order.items || []).filter(
        (item) => String(item?.vendorId || "") === normalizedVendorId,
      );

      if (!vendorItems.length) return null;

      return {
        order,
        vendorItems,
        itemCount: vendorItems.reduce(
          (sum, item) => sum + Number(item?.quantity || 0),
          0,
        ),
        vendorSubtotal: vendorItems.reduce(
          (sum, item) => sum + Number(item?.subtotal || 0),
          0,
        ),
      };
    })
    .filter(Boolean);
};

const buildVendorRevenueSummary = async (vendorId) => {
  const [snapshots, payoutRequests] = await Promise.all([
    getVendorOrderSnapshots(vendorId),
    VendorPayout.find({ vendorId }).sort({ createdAt: -1 }).lean(),
  ]);

  const grossRevenue = snapshots.reduce(
    (sum, entry) => sum + Number(entry.vendorSubtotal || 0),
    0,
  );
  const deliveredRevenue = snapshots
    .filter((entry) => DELIVERED_STATUSES.includes(entry.order.orderStatus))
    .reduce((sum, entry) => sum + Number(entry.vendorSubtotal || 0), 0);
  const pendingRevenue = snapshots
    .filter((entry) => PENDING_REVENUE_STATUSES.includes(entry.order.orderStatus))
    .reduce((sum, entry) => sum + Number(entry.vendorSubtotal || 0), 0);
  const returnedRevenue = snapshots
    .filter((entry) => RETURNED_STATUSES.includes(entry.order.orderStatus))
    .reduce((sum, entry) => sum + Number(entry.vendorSubtotal || 0), 0);
  const cancelledRevenue = snapshots
    .filter((entry) => entry.order.orderStatus === "cancelled")
    .reduce((sum, entry) => sum + Number(entry.vendorSubtotal || 0), 0);
  const lockedPayoutAmount = payoutRequests
    .filter((request) => PAYOUT_LOCKED_STATUSES.includes(request.status))
    .reduce((sum, request) => sum + Number(request.requestedAmount || 0), 0);
  const paidOutAmount = payoutRequests
    .filter((request) => PAYOUT_PAID_STATUSES.includes(request.status))
    .reduce((sum, request) => sum + Number(request.requestedAmount || 0), 0);
  const availablePayoutAmount = Math.max(
    0,
    deliveredRevenue - lockedPayoutAmount - paidOutAmount,
  );

  return {
    snapshots,
    payoutRequests,
    summary: {
      totalOrders: snapshots.length,
      grossRevenue,
      deliveredRevenue,
      pendingRevenue,
      returnedRevenue,
      cancelledRevenue,
      lockedPayoutAmount,
      paidOutAmount,
      availablePayoutAmount,
    },
  };
};

const findPortalAccountByEmail = async (email, expectedRole) => {
  const normalizedEmail = normalizeEmail(email);
  const account = await Vendor.findOne({
    email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
  });

  if (!account) return null;

  if (expectedRole && account.role !== expectedRole) {
    return "wrong-role";
  }

  return account;
};

const resolveAccountTypeLabel = (role) => (role === "admin" ? "admin" : "vendor");

const loginPortal = async (req, res, expectedRole = "vendor") => {
  const validatedData = loginSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: validatedData.error.flatten(),
    });
  }

  const { email, password } = validatedData.data;
  const account = await findPortalAccountByEmail(email, expectedRole);

  if (!account || account === "wrong-role") {
    return res.status(401).json({
      success: false,
      message:
        expectedRole === "admin"
          ? "This account is not authorized for admin access"
          : "Invalid credentials",
    });
  }

  if (account.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked plz contact customer care",
    });
  }

  const isPasswordMatch = await bcrypt.compare(password, account.password);
  if (!isPasswordMatch) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  setVendorAuthCookies(res, account._id);
  return res.status(200).json({
    success: true,
    message: `Welcom back ${account.name}`,
    vendor: account,
  });
};

const sendPortalResetOtp = async (req, res, expectedRole = "vendor") => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  const account = await findPortalAccountByEmail(email, expectedRole);

  if (!account || account === "wrong-role") {
    return res.status(404).json({
      success: false,
      message:
        expectedRole === "admin" ? "Admin not found" : "Vendor not found",
    });
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));

  account.resetOtp = createOtpHash(otp);
  account.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
  await account.save();

  await sendResetOtpEmail({
    to: account.email,
    name: account.name,
    otp,
    accountType: resolveAccountTypeLabel(expectedRole),
  });

  return res.json({ success: true, message: "OTP sent your email" });
};

const resetPortalPassword = async (req, res, expectedRole = "vendor") => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP, and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  const account = await findPortalAccountByEmail(email, expectedRole);

  if (!account || account === "wrong-role") {
    return res.status(404).json({
      success: false,
      message:
        expectedRole === "admin" ? "Admin not found" : "Vendor not found",
    });
  }

  if (!account.resetOtp || account.resetOtp !== createOtpHash(otp)) {
    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  if (account.resetOtpExpireAt < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP Expired" });
  }

  const salt = await bcrypt.genSalt(10);
  account.password = await bcrypt.hash(newPassword, salt);
  account.resetOtp = "";
  account.resetOtpExpireAt = 0;
  await account.save();

  try {
    await sendPasswordChangedEmail({
      to: account.email,
      name: account.name,
      accountType: resolveAccountTypeLabel(expectedRole),
    });
  } catch (mailErr) {
    console.error("Confirmation mail error:", mailErr);
  }

  return res.status(200).json({
    success: true,
    message: "Password has been reset successfully",
  });
};

const deleteSupportAttachments = async (messages = []) => {
  const publicIds = messages.flatMap((message) =>
    (message.attachments || []).map((attachment) => attachment?.publicId).filter(Boolean)
  );

  await Promise.all(
    [...new Set(publicIds)].map((publicId) => deleteMediaFromCloudinary(publicId))
  );
};

const reviewProductRegistry = {
  fashion: { productType: "Fashion", model: Fashion },
  electronics: { productType: "Electronics", model: Electronic },
  electronic: { productType: "Electronics", model: Electronic },
  bag: { productType: "Bag", model: Bag },
  footwear: { productType: "Footwear", model: Footwear },
  grocery: { productType: "Grocery", model: Grocery },
  beauty: { productType: "Beauty", model: Beauty },
  wellness: { productType: "Wellness", model: Wellness },
  jewellery: { productType: "Jewellery", model: Jewellery },
};

const normalizeProductType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const resolveReviewProductContext = (productType) =>
  reviewProductRegistry[normalizeProductType(productType)] || null;

const syncProductReviewStats = async ({ productId, productType }) => {
  const context = resolveReviewProductContext(productType);
  if (!context || !mongoose.isValidObjectId(productId)) return;

  const product = await context.model
    .findById(productId)
    .select("rating baseRating")
    .lean();
  if (!product) return;

  const aggregate = await ProductReview.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        productType: context.productType,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const summary = aggregate[0] || {
    averageRating: 0,
    totalReviews: 0,
  };

  const normalizedBaseRating =
    product.baseRating !== null && product.baseRating !== undefined
      ? Number(product.baseRating || 0)
      : Number(product.rating || 0);
  const baseWeight = normalizedBaseRating > 0 ? 1 : 0;
  const blendedRating =
    Number(summary.totalReviews || 0) > 0
      ? Number(
          (
            ((Number(summary.averageRating || 0) * Number(summary.totalReviews || 0)) +
              normalizedBaseRating * baseWeight) /
            (Number(summary.totalReviews || 0) + baseWeight)
          ).toFixed(1)
        )
      : normalizedBaseRating;

  await context.model.findByIdAndUpdate(productId, {
    baseRating:
      product.baseRating !== null && product.baseRating !== undefined
        ? product.baseRating
        : normalizedBaseRating,
    rating: blendedRating,
    reviews: Number(summary.totalReviews || 0),
  });
};

const cleanupReferralLinksForDeletedUser = async (userId) => {
  if (!userId) return;

  await User.updateMany(
    { "referral.referredBy": userId },
    { $set: { "referral.referredBy": null } }
  );

  const referrers = await User.find({ "referral.rewards.userId": userId }).select("referral");

  for (const referrer of referrers) {
    const rewards = Array.isArray(referrer.referral?.rewards)
      ? referrer.referral.rewards
      : [];
    const retainedRewards = rewards.filter(
      (reward) => String(reward?.userId || "") !== String(userId)
    );
    const removedRewards = rewards.filter(
      (reward) => String(reward?.userId || "") === String(userId)
    );

    if (!removedRewards.length) continue;

    const removedAmount = removedRewards.reduce(
      (sum, reward) => sum + Number(reward?.amount || 0),
      0
    );

    referrer.referral.rewards = retainedRewards;
    referrer.referral.successfulReferrals = Math.max(
      0,
      Number(referrer.referral?.successfulReferrals || 0) - removedRewards.length
    );
    referrer.referral.totalEarned = Math.max(
      0,
      Number(referrer.referral?.totalEarned || 0) - removedAmount
    );

    await referrer.save();
  }
};

const cleanupUserRelatedData = async (user) => {
  if (!user) return;

  const userId = user._id;
  const [userOrders, userReviews, supportConversations] = await Promise.all([
    Order.find({ userId }).select("_id"),
    ProductReview.find({ userId }).select("productId productType orderId").lean(),
    SupportConversation.find({ user: userId }).select("_id"),
  ]);
  const orderIds = userOrders.map((order) => order._id);
  const affectedReviewTargets = [
    ...new Map(
      userReviews
        .filter((review) => review?.productId && review?.productType)
        .map((review) => [
          `${review.productType}:${String(review.productId)}`,
          { productId: review.productId, productType: review.productType },
        ])
    ).values(),
  ];

  const conversationIds = supportConversations.map((conversation) => conversation._id);
  const supportMessages = conversationIds.length
    ? await SupportMessage.find({ conversation: { $in: conversationIds } }).select("attachments")
    : [];

  await deleteCloudinaryUrl(user.photoUrl);
  await deleteSupportAttachments(supportMessages);

  const notificationFilter = orderIds.length
    ? { $or: [{ userId }, { orderId: { $in: orderIds } }] }
    : { userId };

  await Promise.all([
    Cart.deleteOne({ userId }),
    Wishlist.deleteMany({ userId }),
    AiUserMemory.deleteMany({ userId }),
    UserNotification.deleteMany(notificationFilter),
    VendorNotification.deleteMany(notificationFilter),
    orderIds.length
      ? DeliveryNotification.deleteMany({ orderId: { $in: orderIds } })
      : Promise.resolve(),
    orderIds.length
      ? ProductReview.deleteMany({
          $or: [{ userId }, { orderId: { $in: orderIds } }],
        })
      : ProductReview.deleteMany({ userId }),
    orderIds.length ? Order.deleteMany({ _id: { $in: orderIds } }) : Promise.resolve(),
    conversationIds.length
      ? SupportMessage.deleteMany({ conversation: { $in: conversationIds } })
      : Promise.resolve(),
    conversationIds.length
      ? SupportConversation.deleteMany({ _id: { $in: conversationIds } })
      : Promise.resolve(),
  ]);

  await Promise.all([
    cleanupReferralLinksForDeletedUser(userId),
    ...affectedReviewTargets.map((reviewTarget) => syncProductReviewStats(reviewTarget)),
  ]);

  await User.findByIdAndDelete(userId);
};

const cleanupVendorRelatedData = async (vendor) => {
  if (!vendor) return;

  const vendorId = vendor._id;

  const [categoryDocs, supportConversations, vendorProducts, orders] = await Promise.all([
    Category.find({ vendorId }).lean(),
    SupportConversation.find({ assignedVendor: vendorId }).select("_id"),
    Promise.all(
      vendorProductModels.map((Model) => Model.find({ vendorId }).select("_id image").lean())
    ),
    Order.find({ "items.vendorId": vendorId }),
  ]);

  const conversationIds = supportConversations.map((conversation) => conversation._id);
  const supportMessages = conversationIds.length
    ? await SupportMessage.find({ conversation: { $in: conversationIds } }).select("attachments")
    : [];

  const productDocs = vendorProducts.flat();
  const deletedProductIds = productDocs.map((product) => product._id);
  const productImageUrls = productDocs.flatMap((product) => product.image || []);
  const categoryImageUrls = categoryDocs.flatMap((doc) =>
    (doc.categories || []).map((category) => category?.image).filter(Boolean)
  );

  await deleteCloudinaryUrl(vendor.photoUrl);
  await deleteCloudinaryUrls([...productImageUrls, ...categoryImageUrls]);
  await deleteSupportAttachments(supportMessages);

  for (const order of orders) {
    order.items = (order.items || []).filter(
      (item) => String(item.vendorId) !== String(vendorId)
    );
    order.totalAmount = order.items.reduce(
      (sum, item) => sum + Number(item.subtotal || item.price * item.quantity || 0),
      0
    );

    if (!order.items.length) {
      await Promise.all([
        UserNotification.deleteMany({ orderId: order._id }),
        VendorNotification.deleteMany({ orderId: order._id }),
      ]);
      await order.deleteOne();
      continue;
    }

    await Promise.all([
      UserNotification.deleteMany({ vendorId, orderId: order._id }),
      VendorNotification.deleteMany({ vendorId, orderId: order._id }),
    ]);
    await order.save();
  }

  const productCleanupQuery = deletedProductIds.length
    ? { items: { $elemMatch: { productId: { $in: deletedProductIds } } } }
    : null;

  await Promise.all([
    ...vendorProductModels.map((Model) => Model.deleteMany({ vendorId })),
    ...vendorBrandModels.map((Model) => Model.deleteMany({ vendorId })),
    Category.deleteMany({ vendorId }),
    VendorNotification.deleteMany({ vendorId }),
    UserNotification.deleteMany({ vendorId }),
    conversationIds.length
      ? SupportMessage.deleteMany({ conversation: { $in: conversationIds } })
      : Promise.resolve(),
    conversationIds.length
      ? SupportConversation.deleteMany({ _id: { $in: conversationIds } })
      : Promise.resolve(),
    productCleanupQuery
      ? Cart.updateMany(
          productCleanupQuery,
          { $pull: { items: { productId: { $in: deletedProductIds } } } }
        )
      : Promise.resolve(),
    productCleanupQuery
      ? Wishlist.updateMany(
          productCleanupQuery,
          { $pull: { items: { productId: { $in: deletedProductIds } } } }
        )
      : Promise.resolve(),
    Vendor.findByIdAndDelete(vendorId),
  ]);
};

export const createVendor = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      phone: req.body.phone ? Number(req.body.phone) : undefined,
    };

    const validatedData = registerSchema.safeParse(payload);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten(),
      });
    }

    const { name, email, password, phone } = validatedData.data;
    const normalizedEmail = normalizeEmail(email);

    const existedVendor = await Vendor.findOne({
      email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    });
    if (existedVendor) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newVendor = new Vendor({
      name,
      email: normalizedEmail,
      password: hashPassword,
      phone,
      welcomeMailSent: false,
      bio:
        typeof req.body.bio === "string" && req.body.bio.trim()
          ? req.body.bio.trim()
          : undefined,
    });

    await newVendor.save();
    emitVendorSummaryUpdate();

    try {
      await sendWelcomeEmail({
        to: newVendor.email,
        name,
        accountType: "vendor",
      });

      await Vendor.updateOne(
        { _id: newVendor._id },
        { $set: { welcomeMailSent: true } }
      );
    } catch (mailErr) {
      console.error("Vendor welcome mail error:", mailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor: newVendor,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    return await loginPortal(req, res, "vendor");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminLogin = async (req, res) => {
  try {
    return await loginPortal(req, res, "admin");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    clearVendorAuthCookies(res);

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

export const getVendorSocketAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      socketToken: signSocketToken({
        vendorId: req.id,
        role: "vendor",
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create socket auth token",
    });
  }
};

export const getAdminSocketAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      socketToken: signSocketToken({
        vendorId: req.id,
        role: "vendor",
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create socket auth token",
    });
  }
};

export const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.id;
    const vendor = await Vendor.findById(vendorId).select("-password");
    if (!vendor) {
      return res.status(404).json({
        message: "Profile not found",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load vendor profile",
    });
  }
};

export const getDashboardSummary = async (req, res) => {
  try {
    const recentCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (req.role === "admin") {
      const [
        totalAdmins,
        totalUsers,
        totalVendors,
        totalDeliveryPartners,
        recentAdmins,
        recentUsers,
        recentVendors,
        recentDeliveryPartners,
      ] = await Promise.all([
        Admin.countDocuments(),
        User.countDocuments(),
        Vendor.countDocuments(),
        DeliveryPartner.countDocuments(),
        Admin.countDocuments({ createdAt: { $gte: recentCutoff } }),
        User.countDocuments({ createdAt: { $gte: recentCutoff } }),
        Vendor.countDocuments({ createdAt: { $gte: recentCutoff } }),
        DeliveryPartner.countDocuments({ createdAt: { $gte: recentCutoff } }),
      ]);

      return res.status(200).json({
        success: true,
        summary: {
          totalAdmins,
          totalUsers,
          totalVendors,
          totalDeliveryPartners,
          recentAdmins,
          recentUsers,
          recentVendors,
          recentDeliveryPartners,
        },
      });
    }

    const vendorId = req.id;
    const [productCounts, stockAggregates, orderSnapshots] = await Promise.all([
      Promise.all(vendorProductModels.map((Model) => Model.countDocuments({ vendorId }))),
      Promise.all(
        vendorProductModels.map((Model) =>
          Model.aggregate([
            { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
            {
              $group: {
                _id: null,
                totalStock: { $sum: { $ifNull: ["$quantity", 0] } },
                lowStockItems: {
                  $sum: {
                    $cond: [{ $lte: [{ $ifNull: ["$quantity", 0] }, 5] }, 1, 0],
                  },
                },
              },
            },
          ])
        )
      ),
      getVendorOrderSnapshots(vendorId),
    ]);

    const totalProducts = productCounts.reduce((sum, count) => sum + Number(count || 0), 0);
    const recentProducts = productCounts.reduce((sum, count) => sum + Number(count || 0), 0);
    const totalInventory = stockAggregates.reduce(
      (sum, entry) => sum + Number(entry?.[0]?.totalStock || 0),
      0
    );
    const lowStockItems = stockAggregates.reduce(
      (sum, entry) => sum + Number(entry?.[0]?.lowStockItems || 0),
      0
    );
    const totalOrders = orderSnapshots.length;
    const recentOrders = orderSnapshots.filter(
      (entry) => new Date(entry.order?.createdAt || 0) >= recentCutoff
    ).length;
    const deliveredOrders = orderSnapshots.filter((entry) =>
      DELIVERED_STATUSES.includes(entry.order?.orderStatus)
    ).length;
    const totalRevenue = orderSnapshots.reduce(
      (sum, entry) => sum + Number(entry.vendorSubtotal || 0),
      0
    );

    return res.status(200).json({
      success: true,
      summary: {
        totalProducts,
        recentProducts,
        totalInventory,
        lowStockItems,
        totalOrders,
        recentOrders,
        deliveredOrders,
        totalRevenue,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard summary",
    });
  }
};

export const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.id;
    const { name, phone, bio, dob, addresses } = req.body;
    const profilePhoto = req.file;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    let photoUrl = vendor.photoUrl;
    if (profilePhoto) {
      if (vendor.photoUrl) {
        const urlParts = vendor.photoUrl.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/vendor/${publicId}`);
      }

      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the 10MB limit.",
        });
      }

      const cloudResponse = await uploadMediaVendor(req.file);
      if (!cloudResponse || !cloudResponse.secure_url) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile photo.",
        });
      }

      photoUrl = cloudResponse.secure_url;
    }

    const parsedAddresses =
      typeof addresses === "string" ? JSON.parse(addresses) : addresses;

    const updatedVendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { name, phone, bio, dob, addresses: parsedAddresses, photoUrl },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      vendor: updatedVendor,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const vendor = await Vendor.findById(req.id);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, vendor.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    vendor.password = await bcrypt.hash(newPassword, salt);
    await vendor.save();

    try {
      await sendPasswordChangedEmail({
        to: vendor.email,
        name: vendor.name,
        accountType: "vendor",
      });
    } catch (mailErr) {
      console.error("Confirmation mail error:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const adminChangePassword = async (req, res) => {
  try {
    return await changePassword(req, res);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const sendResetOtp = async (req, res) => {
  try {
    return await sendPortalResetOtp(req, res, "vendor");
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send otp" });
  }
};

export const sendAdminResetOtp = async (req, res) => {
  try {
    return await sendPortalResetOtp(req, res, "admin");
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send otp" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    return await resetPortalPassword(req, res, "vendor");
  } catch (error) {
    console.error("Reset Password Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during password reset" });
  }
};

export const adminResetPassword = async (req, res) => {
  try {
    return await resetPortalPassword(req, res, "admin");
  } catch (error) {
    console.error("Reset Password Error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error during password reset" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Failed to load users:", error);
    return res.status(500).json({ success: false, message: "Failed to load users" });
  }
};

export const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, vendors });
  } catch (error) {
    console.error("Failed to load vendors:", error);
    return res.status(500).json({ success: false, message: "Failed to load vendors" });
  }
};

export const getNewsletterSubscribers = async (_req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.find({ isActive: true }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      subscribers,
    });
  } catch (error) {
    console.error("Failed to load newsletter subscribers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load newsletter subscribers",
    });
  }
};

export const exportNewsletterSubscribersCsv = async (_req, res) => {
  try {
    const subscribers = await NewsletterSubscriber.find({ isActive: true }).sort({
      createdAt: -1,
    });

    const csvRows = [
      ["Email", "Source", "Status", "Subscribed At"].join(","),
      ...subscribers.map((subscriber) =>
        [
          `"${String(subscriber.email || "").replace(/"/g, '""')}"`,
          `"${String(subscriber.source || "").replace(/"/g, '""')}"`,
          `"${subscriber.isActive ? "Active" : "Inactive"}"`,
          `"${new Date(subscriber.createdAt).toISOString()}"`,
        ].join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="newsletter-subscribers-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    );

    return res.status(200).send(csvRows.join("\n"));
  } catch (error) {
    console.error("Failed to export newsletter subscribers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export newsletter subscribers",
    });
  }
};

export const getVendorPayoutSummary = async (req, res) => {
  try {
    const { summary } = await buildVendorRevenueSummary(req.id);

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Failed to load vendor payout summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load payout summary",
    });
  }
};

export const getVendorPayoutRequests = async (req, res) => {
  try {
    const payoutRequests = await VendorPayout.find({ vendorId: req.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      payoutRequests,
    });
  } catch (error) {
    console.error("Failed to load vendor payout requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load payout requests",
    });
  }
};

export const getAllVendorPayoutRequests = async (_req, res) => {
  try {
    const payoutRequests = await VendorPayout.find({})
      .populate("vendorId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      payoutRequests,
    });
  } catch (error) {
    console.error("Failed to load all vendor payout requests:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load payout queue",
    });
  }
};

export const requestVendorPayout = async (req, res) => {
  try {
    const requestedAmount = Number(req.body?.amount || 0);
    const notes = String(req.body?.notes || "").trim();

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid payout amount",
      });
    }

    const { summary } = await buildVendorRevenueSummary(req.id);

    if (requestedAmount > summary.availablePayoutAmount) {
      return res.status(400).json({
        success: false,
        message: "Requested amount exceeds available payout balance",
      });
    }

    const payoutRequest = await VendorPayout.create({
      vendorId: req.id,
      requestedAmount,
      availableBalanceAtRequest: summary.availablePayoutAmount,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Payout request submitted successfully",
      payoutRequest,
    });
  } catch (error) {
    console.error("Failed to create vendor payout request:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit payout request",
    });
  }
};

export const updateVendorPayoutStatus = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const nextStatus = String(req.body?.status || "")
      .trim()
      .toLowerCase();
    const processedNotes = String(req.body?.processedNotes || "").trim();

    if (!["approved", "rejected", "paid"].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payout status",
      });
    }

    const payoutRequest = await VendorPayout.findById(payoutId);
    if (!payoutRequest) {
      return res.status(404).json({
        success: false,
        message: "Payout request not found",
      });
    }

    if (payoutRequest.status === "paid" && nextStatus !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Paid payout requests cannot be changed",
      });
    }

    if (nextStatus === "paid" && payoutRequest.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved payout requests can be marked as paid",
      });
    }

    payoutRequest.status = nextStatus;
    payoutRequest.processedAt = new Date();
    payoutRequest.processedNotes = processedNotes;
    await payoutRequest.save();

    const vendor = await Vendor.findById(payoutRequest.vendorId).select("name email");
    await VendorNotification.create({
      vendorId: payoutRequest.vendorId,
      type: "system",
      title: `Payout ${nextStatus}`,
      message: `Your payout request for Rs ${Number(payoutRequest.requestedAmount || 0).toLocaleString("en-IN")} is now ${nextStatus}.${processedNotes ? ` Note: ${processedNotes}` : ""}`,
    });
    emitVendorNotificationUpdate(payoutRequest.vendorId);

    if (vendor?.email) {
      try {
        await sendPayoutStatusEmail({
          to: vendor.email,
          name: vendor.name,
          accountType: "vendor",
          amount: payoutRequest.requestedAmount,
          status: nextStatus,
          note: processedNotes,
        });
      } catch (mailErr) {
        console.error("Vendor payout status email error:", mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payout request ${nextStatus} successfully`,
      payoutRequest,
    });
  } catch (error) {
    console.error("Failed to update payout request status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payout status",
    });
  }
};

export const exportVendorPayoutsCsv = async (req, res) => {
  try {
    const payoutRequests = await VendorPayout.find({ vendorId: req.id })
      .sort({ createdAt: -1 })
      .lean();

    const csvRows = [
      ["Requested Amount", "Status", "Notes", "Requested At", "Processed At"].join(","),
      ...payoutRequests.map((request) =>
        [
          formatCsvCell(Number(request.requestedAmount || 0).toFixed(2)),
          formatCsvCell(request.status),
          formatCsvCell(request.notes),
          formatCsvCell(new Date(request.createdAt).toISOString()),
          formatCsvCell(
            request.processedAt ? new Date(request.processedAt).toISOString() : "",
          ),
        ].join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vendor-payouts-${new Date().toISOString().slice(0, 10)}.csv"`,
    );

    return res.status(200).send(csvRows.join("\n"));
  } catch (error) {
    console.error("Failed to export vendor payouts:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export payout report",
    });
  }
};

export const exportVendorOrdersReportCsv = async (req, res) => {
  try {
    const { snapshots } = await buildVendorRevenueSummary(req.id);

    const csvRows = [
      [
        "Order ID",
        "Created At",
        "Status",
        "Payment Method",
        "Customer",
        "Vendor Items",
        "Vendor Quantity",
        "Vendor Revenue",
      ].join(","),
      ...snapshots.map((entry) =>
        [
          formatCsvCell(entry.order.orderId),
          formatCsvCell(new Date(entry.order.createdAt).toISOString()),
          formatCsvCell(entry.order.orderStatus),
          formatCsvCell(entry.order.paymentMethod),
          formatCsvCell(entry.order.shippingAddress?.fullName || ""),
          formatCsvCell(
            entry.vendorItems
              .map((item) => item.productName || item.productType)
              .join(" | "),
          ),
          formatCsvCell(entry.itemCount),
          formatCsvCell(Number(entry.vendorSubtotal || 0).toFixed(2)),
        ].join(","),
      ),
    ];

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vendor-orders-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    );

    return res.status(200).send(csvRows.join("\n"));
  } catch (error) {
    console.error("Failed to export vendor orders report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export order report",
    });
  }
};

export const exportVendorSummaryReportCsv = async (req, res) => {
  try {
    const { summary } = await buildVendorRevenueSummary(req.id);

    const csvRows = [
      ["Metric", "Value"],
      ["Total Orders", summary.totalOrders],
      ["Gross Revenue", summary.grossRevenue],
      ["Delivered Revenue", summary.deliveredRevenue],
      ["Pending Revenue", summary.pendingRevenue],
      ["Returned Revenue", summary.returnedRevenue],
      ["Cancelled Revenue", summary.cancelledRevenue],
      ["Locked Payout Amount", summary.lockedPayoutAmount],
      ["Paid Out Amount", summary.paidOutAmount],
      ["Available Payout Amount", summary.availablePayoutAmount],
    ].map((row) => row.map((value) => formatCsvCell(value)).join(","));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="vendor-summary-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    );

    return res.status(200).send(csvRows.join("\n"));
  } catch (error) {
    console.error("Failed to export vendor summary report:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to export summary report",
    });
  }
};

const buildUpdatePayload = (body) => {
  const payload = {};
  const fields = ["name", "email", "phone", "bio", "dob"];
  for (const field of fields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }
  if (body.isBlocked !== undefined) {
    payload.isBlocked = body.isBlocked === true || body.isBlocked === "true";
  }
  return payload;
};

const setBlockState = async (Model, id, isBlocked) => {
  const record = await Model.findByIdAndUpdate(
    id,
    { isBlocked },
    { new: true }
  ).select("-password");
  return record;
};

export const updateUserById = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      buildUpdatePayload(req.body),
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, user, message: "User updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update user" });
  }
};

export const deleteUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await cleanupUserRelatedData(user);

    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Failed to delete user with related data:", error);
    return res.status(500).json({ success: false, message: "Failed to delete user" });
  }
};

export const toggleUserBlock = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await setBlockState(User, req.params.id, isBlocked);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    emitVendorSummaryUpdate();
    return res.status(200).json({
      success: true,
      user,
      message: isBlocked ? "User blocked successfully" : "User unblocked successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update user block status" });
  }
};

export const updateVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      buildUpdatePayload(req.body),
      { new: true }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, vendor, message: "Vendor updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update vendor" });
  }
};

export const deleteVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    await cleanupVendorRelatedData(vendor);

    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
    console.error("Failed to delete vendor with related data:", error);
    return res.status(500).json({ success: false, message: "Failed to delete vendor" });
  }
};

export const toggleVendorBlock = async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const vendor = await setBlockState(Vendor, req.params.id, isBlocked);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    emitVendorSummaryUpdate();
    return res.status(200).json({
      success: true,
      vendor,
      message: isBlocked ? "Vendor blocked successfully" : "Vendor unblocked successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to update vendor block status" });
  }
};

export const getVendorNotifications = async (req, res) => {
  try {
    const notifications = await VendorNotification.find({ vendorId: req.id })
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

export const markVendorNotificationsAsRead = async (req, res) => {
  try {
    await VendorNotification.updateMany(
      {
        vendorId: req.id,
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

export const deleteVendorNotification = async (req, res) => {
  try {
    const notification = await VendorNotification.findOneAndDelete({
      _id: req.params.id,
      vendorId: req.id,
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

export const clearVendorNotifications = async (req, res) => {
  try {
    await VendorNotification.deleteMany({ vendorId: req.id });
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
