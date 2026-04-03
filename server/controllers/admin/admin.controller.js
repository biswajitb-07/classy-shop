import bcrypt from "bcryptjs";
import { Admin } from "../../models/admin/admin.model.js";
import {
  clearAdminAuthCookies,
  setAdminAuthCookies,
  signSocketToken,
} from "../../utils/authCookies.js";
import {
  deleteMediaFromCloudinary,
  uploadMedia,
} from "../../utils/cloudinary.js";
import {
  sendPasswordChangedEmail,
  sendResetOtpEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";
import {
  loginSchema,
  registerSchema,
} from "../../validation/vendor/vendor.validation.js";
import { createOtpHash } from "../../utils/security.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeAdminForClient = (adminDoc) => {
  const adminObject =
    typeof adminDoc?.toObject === "function" ? adminDoc.toObject() : { ...adminDoc };

  return {
    ...adminObject,
    password: undefined,
    hasPassword: Boolean(adminObject?.password),
  };
};

const buildAdminPayload = (adminDoc) => {
  const admin = sanitizeAdminForClient(adminDoc);
  return {
    admin,
    vendor: admin,
  };
};

const findAdminByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  return Admin.findOne({
    email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
  });
};

export const ensureDefaultAdminAccount = async () => {
  const defaultEmail = normalizeEmail("barikbiswajit152@gmail.com");
  const existingAdmin = await Admin.findOne({ email: defaultEmail });

  if (existingAdmin) return existingAdmin;

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash("112233", salt);

  const admin = await Admin.create({
    name: "Biswajit Barik",
    email: defaultEmail,
    password,
    bio: "Primary platform administrator account.",
    welcomeMailSent: true,
  });

  return admin;
};

export const adminLogin = async (req, res) => {
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
    const admin = await findAdminByEmail(email);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    setAdminAuthCookies(res, admin._id);

    return res.status(200).json({
      success: true,
      message: `Welcome back ${admin.name}`,
      ...buildAdminPayload(admin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutAdmin = async (_req, res) => {
  try {
    clearAdminAuthCookies(res);
    return res.status(204).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Failed to logout",
    });
  }
};

export const getAdminSocketAuth = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      socketToken: signSocketToken({
        adminId: req.id,
        role: "admin",
      }),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create socket auth token",
    });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      ...buildAdminPayload(admin),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load admin profile",
    });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, bio, dob, addresses } = req.body;
    const profilePhoto = req.file;
    const admin = await Admin.findById(req.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    let photoUrl = admin.photoUrl;
    if (profilePhoto) {
      if (admin.photoUrl) {
        const urlParts = admin.photoUrl.split("/");
        const filename = urlParts[urlParts.length - 1];
        const publicId = filename.split(".")[0];
        await deleteMediaFromCloudinary(`falcon/image/${publicId}`);
      }

      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the 10MB limit.",
        });
      }

      const cloudResponse = await uploadMedia(req.file);
      if (!cloudResponse?.secure_url) {
        return res.status(500).json({
          success: false,
          message: "Failed to upload profile photo.",
        });
      }

      photoUrl = cloudResponse.secure_url;
    }

    const parsedAddresses =
      typeof addresses === "string" ? JSON.parse(addresses) : addresses;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.id,
      { name, phone, bio, dob, addresses: parsedAddresses, photoUrl },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      ...buildAdminPayload(updatedAdmin),
    });
  } catch (_error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

export const adminChangePassword = async (req, res) => {
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

    const admin = await Admin.findById(req.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    await admin.save();

    try {
      await sendPasswordChangedEmail({
        to: admin.email,
        name: admin.name,
        accountType: "admin",
      });
    } catch (mailErr) {
      console.error("Admin password mail error:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendAdminResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const admin = await findAdminByEmail(email);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    admin.resetOtp = createOtpHash(otp);
    admin.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;
    await admin.save();

    await sendResetOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
      accountType: "admin",
    });

    return res.json({ success: true, message: "OTP sent your email" });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to send otp" });
  }
};

export const adminResetPassword = async (req, res) => {
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

    const admin = await findAdminByEmail(email);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!admin.resetOtp || admin.resetOtp !== createOtpHash(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (admin.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
    admin.resetOtp = "";
    admin.resetOtpExpireAt = 0;
    await admin.save();

    try {
      await sendPasswordChangedEmail({
        to: admin.email,
        name: admin.name,
        accountType: "admin",
      });
    } catch (mailErr) {
      console.error("Admin reset password mail error:", mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (_error) {
    return res
      .status(500)
      .json({ success: false, message: "Server error during password reset" });
  }
};

export const getAllAdmins = async (_req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, admins });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to load admins" });
  }
};

export const createAdmin = async (req, res) => {
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

    const existedAdmin = await findAdminByEmail(normalizedEmail);
    if (existedAdmin) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newAdmin = await Admin.create({
      name,
      email: normalizedEmail,
      password: hashPassword,
      phone,
      bio:
        typeof req.body.bio === "string" && req.body.bio.trim()
          ? req.body.bio.trim()
          : undefined,
    });

    try {
      await sendWelcomeEmail({
        to: newAdmin.email,
        name: newAdmin.name,
        accountType: "admin",
      });
      await Admin.updateOne(
        { _id: newAdmin._id },
        { $set: { welcomeMailSent: true } }
      );
    } catch (mailErr) {
      console.error("Admin welcome mail error:", mailErr);
    }

    return res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: sanitizeAdminForClient(newAdmin),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const targetAdmin = await Admin.findById(id);

    if (!targetAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    if (req.body.email) {
      const normalizedEmail = normalizeEmail(req.body.email);
      const existedAdmin = await Admin.findOne({
        _id: { $ne: id },
        email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
      });
      if (existedAdmin) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
      targetAdmin.email = normalizedEmail;
    }

    if (req.body.name !== undefined) targetAdmin.name = String(req.body.name || "").trim();
    if (req.body.phone !== undefined) {
      targetAdmin.phone = req.body.phone ? Number(req.body.phone) : null;
    }
    if (req.body.bio !== undefined) targetAdmin.bio = String(req.body.bio || "").trim();
    await targetAdmin.save();

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      admin: sanitizeAdminForClient(targetAdmin),
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to update admin" });
  }
};

export const deleteAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (String(req.id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account",
      });
    }

    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        message: "At least one admin account must remain",
      });
    }

    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to delete admin" });
  }
};

export const toggleAdminBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (String(req.id) === String(id) && Boolean(isBlocked)) {
      return res.status(400).json({
        success: false,
        message: "You cannot block your own admin account",
      });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { isBlocked: Boolean(isBlocked) },
      { new: true }
    ).select("-password");

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: updatedAdmin.isBlocked ? "Admin blocked" : "Admin unblocked",
      admin: updatedAdmin,
    });
  } catch (_error) {
    return res.status(500).json({ success: false, message: "Failed to update admin status" });
  }
};

export const getAdminNotifications = async (_req, res) =>
  res.status(200).json({ success: true, notifications: [] });

export const markAdminNotificationsAsRead = async (_req, res) =>
  res.status(200).json({ success: true, message: "Notifications marked as read" });

export const deleteAdminNotification = async (_req, res) =>
  res.status(200).json({ success: true, message: "Notification deleted" });

export const clearAdminNotifications = async (_req, res) =>
  res.status(200).json({ success: true, message: "Notifications cleared" });
