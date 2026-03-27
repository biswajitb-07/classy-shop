// File guide: vendor.controller source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { Vendor } from "../../models/vendor/vendor.model.js";
import { User } from "../../models/user/user.model.js";
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
import { VendorNotification } from "../../models/vendor/vendorNotification.model.js";
import { emitVendorSummaryUpdate } from "../../socket/socket.js";
import {
  sendPasswordChangedEmail,
  sendResetOtpEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";

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

    const existedVendor = await Vendor.findOne({ email });
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
      email,
      password: hashPassword,
      phone,
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

    const vendor = await Vendor.findOne({ email });
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
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (error) {
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
    const vendor = await Vendor.findByIdAndDelete(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }
    emitVendorSummaryUpdate();
    return res.status(200).json({ success: true, message: "Vendor deleted successfully" });
  } catch (error) {
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
