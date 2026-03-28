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
import {
  sendPasswordChangedEmail,
  sendResetOtpEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const deleteSupportAttachments = async (messages = []) => {
  const publicIds = messages.flatMap((message) =>
    (message.attachments || []).map((attachment) => attachment?.publicId).filter(Boolean)
  );

  await Promise.all(
    [...new Set(publicIds)].map((publicId) => deleteMediaFromCloudinary(publicId))
  );
};

const cleanupUserRelatedData = async (user) => {
  if (!user) return;

  const userId = user._id;
  const userOrders = await Order.find({ userId }).select("_id");
  const orderIds = userOrders.map((order) => order._id);

  const supportConversations = await SupportConversation.find({ user: userId }).select("_id");
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
    UserNotification.deleteMany(notificationFilter),
    VendorNotification.deleteMany(notificationFilter),
    orderIds.length ? Order.deleteMany({ _id: { $in: orderIds } }) : Promise.resolve(),
    conversationIds.length
      ? SupportMessage.deleteMany({ conversation: { $in: conversationIds } })
      : Promise.resolve(),
    conversationIds.length
      ? SupportConversation.deleteMany({ _id: { $in: conversationIds } })
      : Promise.resolve(),
    User.findByIdAndDelete(userId),
  ]);
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
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten(),
      });
    }

    const { email, password } = validatedData.data;
    const normalizedEmail = normalizeEmail(email);

    const vendor = await Vendor.findOne({
      email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
    });
    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (vendor.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, vendor.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    setVendorAuthCookies(res, vendor._id);
    return res.status(200).json({
      success: true,
      message: `Welcom back ${vendor.name}`,
      vendor,
    });
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
    const [totalUsers, totalVendors, recentUsers, recentVendors] =
      await Promise.all([
        User.countDocuments(),
        Vendor.countDocuments(),
        User.countDocuments({
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        }),
        Vendor.countDocuments({
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        }),
      ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalUsers,
        totalVendors,
        recentUsers,
        recentVendors,
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

export const sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    vendor.resetOtp = otp;
    vendor.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await vendor.save();

    await sendResetOtpEmail({
      to: vendor.email,
      name: vendor.name,
      otp,
      accountType: "vendor",
    });

    return res.json({ success: true, message: "OTP sent your email" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to send otp" });
  }
};

export const resetPassword = async (req, res) => {
  try {
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

    const vendor = await Vendor.findOne({ email });

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    if (!vendor.resetOtp || vendor.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (vendor.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    vendor.password = hashPassword;
    vendor.resetOtp = "";
    vendor.resetOtpExpireAt = 0;

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

    return res
      .status(200)
      .json({ success: true, message: "Password has been reset successfully" });
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
