import { User } from "../../models/user/user.model.js";
import bcrypt from "bcryptjs";
import {
  registerSchema,
  loginSchema,
} from "../../validation/user/user.validation.js";
import {
  deleteMediaFromCloudinary,
  uploadMedia,
} from "../../utils/cloudinary.js";
import {
  clearUserAuthCookies,
  signSocketToken,
  setUserAuthCookies,
} from "../../utils/authCookies.js";
import { emitVendorSummaryUpdate } from "../../socket/socket.js";
import {
  sendPasswordChangedEmail,
  sendResetOtpEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";
import { verifyFirebaseIdToken } from "../../utils/firebaseAdmin.js";

export const register = async (req, res) => {
  try {
    // Zod validation keeps the controller small and ensures the frontend gets
    // field-level errors in a predictable shape.
    const validatedData = registerSchema.safeParse(req.body);
    if (!validatedData.success) {
      const fieldErrors = validatedData.error.issues.reduce((acc, issue) => {
        acc[issue.path[0]] = issue.message;
        return acc;
      }, {});
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: fieldErrors,
      });
    }

    const { name, email, password } = validatedData.data;

    const existedUser = await User.findOne({ email });
    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      welcomeMailSent: false,
    });

    await newUser.save();
    emitVendorSummaryUpdate();

    try {
      await sendWelcomeEmail({
        to: newUser.email,
        name,
        accountType: "user",
      });

      await User.updateOne(
        { _id: newUser._id },
        { $set: { welcomeMailSent: true } }
      );
    } catch (mailErr) {
      console.error("User welcome mail error:", mailErr);
      await User.updateOne(
        { _id: newUser._id },
        { $set: { welcomeMailSent: false } }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const validatedData = loginSchema.safeParse(req.body);
    if (!validatedData.success) {
      const fieldErrors = validatedData.error.issues.reduce((acc, issue) => {
        acc[issue.path[0]] = issue.message;
        return acc;
      }, {});
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        errors: fieldErrors,
      });
    }

    const { email, password } = validatedData.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // The frontend uses cookie-based auth, so successful login mainly means
    // issuing signed cookies rather than returning a token to localStorage.
    setUserAuthCookies(res, user._id);
    return res.status(200).json({
      success: true,
      message: `Welcome back ${user.name}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const firebaseGoogleLogin = async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || "").trim();

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase idToken is required",
      });
    }

    // Firebase verifies Google ownership; after that we still map the identity
    // into our own Mongo user document and app session.
    const decodedToken = await verifyFirebaseIdToken(idToken);
    const email = String(decodedToken.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email is required",
      });
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    if (!user) {
      // First Google login creates a normal user record so profile, orders,
      // support chat, wishlist, and manual password setup all work uniformly.
      user = new User({
        name: decodedToken.name || email.split("@")[0],
        email,
        password: "",
        role: "user",
        isGoogleUser: true,
        googleId: decodedToken.uid,
        firebaseUid: decodedToken.uid,
        photoUrl: decodedToken.picture || "",
      });
      isNewUser = true;
    } else {
      // Existing email users can still attach Google sign-in later. We keep
      // their account history and only enrich it with Google/Firebase fields.
      user.name = user.name || decodedToken.name || email.split("@")[0];
      user.isGoogleUser = true;
      user.googleId = decodedToken.uid;
      user.firebaseUid = decodedToken.uid;
      if (!user.photoUrl && decodedToken.picture) {
        user.photoUrl = decodedToken.picture;
      }
    }

    await user.save();
    setUserAuthCookies(res, user._id);
    emitVendorSummaryUpdate();

    if (!user.welcomeMailSent) {
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          accountType: "user",
        });

        await User.updateOne(
          { _id: user._id },
          { $set: { welcomeMailSent: true } }
        );
      } catch (mailErr) {
        console.error("Firebase Google welcome mail error:", mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: isNewUser
        ? `Welcome to Classy Store, ${user.name}`
        : `Welcome back ${user.name}`,
      user,
    });
  } catch (error) {
    console.error("Firebase Google login error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to login with Google",
    });
  }
};

export const logout = async (req, res) => {
  try {
    clearUserAuthCookies(res);
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

export const getUserSocketAuth = async (req, res) => {
  try {
    // Socket auth uses a short-lived signed token so the realtime layer does
    // not depend only on cross-origin cookies during the handshake.
    return res.status(200).json({
      success: true,
      socketToken: signSocketToken({
        userId: req.id,
        role: "user",
      }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create socket auth token",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "Profile not found",
        success: false,
      });
    }

    const userObject = user.toObject();

    return res.status(200).json({
      success: true,
      user: {
        ...userObject,
        // The client only needs to know whether a password exists; the hash
        // itself must never be exposed back to the browser.
        password: undefined,
        hasPassword: Boolean(user.password),
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user",
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { name, phone, bio, dob, addresses } = req.body;
    const profilePhoto = req.file;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    let photoUrl = user.photoUrl;
    if (profilePhoto) {
      if (user.photoUrl) {
        // Replace the old Cloudinary asset so repeated profile updates do not
        // keep orphaned images around in the cloud account.
        const urlParts = user.photoUrl.split("/");
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

    // The profile page sends a single default address block, but the schema
    // still supports an address array for future expansion.
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, phone, bio, dob, addresses: parsedAddresses, photoUrl },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully.",
    });
  } catch (error) {
    console.error(error);
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

    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
        accountType: "user",
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
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.resetOtp = otp;
    user.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await user.save();

    await sendResetOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      accountType: "user",
    });

    return res.json({ success: true, message: "OTP sent your email" });
  } catch (error) {
    console.log(error);
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

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.resetOtpExpireAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP Expired" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashPassword;
    user.resetOtp = "";
    user.resetOtpExpireAt = 0;

    await user.save();

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
        accountType: "user",
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
