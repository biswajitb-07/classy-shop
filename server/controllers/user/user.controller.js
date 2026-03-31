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
import { ensureAiUserMemory } from "../../services/ai/memory.service.js";
import {
  creditWallet,
  ensureUserBenefits,
  REFERRAL_REFERRER_BONUS,
  REFERRAL_SIGNUP_BONUS,
} from "../../utils/userBenefits.js";
import { createOtpHash } from "../../utils/security.js";

const normalizeAddresses = (addresses = []) =>
  (Array.isArray(addresses) ? addresses : [])
    .map((address = {}, index) => ({
      type: String(address.type || "home").toLowerCase(),
      label: String(address.label || "").trim(),
      fullName: String(address.fullName || "").trim(),
      phone: String(address.phone || "").trim(),
      addressLine1: String(address.addressLine1 || "").trim(),
      landmark: String(address.landmark || "").trim(),
      village: String(address.village || "").trim(),
      city: String(address.city || "").trim(),
      district: String(address.district || "").trim(),
      state: String(address.state || "").trim(),
      postalCode: String(address.postalCode || "").trim(),
      country: String(address.country || "India").trim(),
      isDefault:
        index === 0
          ? true
          : Boolean(address.isDefault),
      location: {
        latitude:
          address?.location?.latitude !== undefined &&
          address?.location?.latitude !== null
            ? Number(address.location.latitude)
            : null,
        longitude:
          address?.location?.longitude !== undefined &&
          address?.location?.longitude !== null
            ? Number(address.location.longitude)
            : null,
        label: String(address?.location?.label || "").trim(),
        source: String(address?.location?.source || "").trim(),
        updatedAt: address?.location?.updatedAt || null,
      },
    }))
    .filter(
      (address) =>
        address.village ||
        address.city ||
        address.district ||
        address.state ||
        address.postalCode ||
        address.addressLine1,
    )
    .map((address, index, list) => ({
      ...address,
      isDefault: index === 0 ? true : address.isDefault && !list[0]?.isDefault,
    }));

const sanitizeUserForClient = (userDoc) => {
  const userObject =
    typeof userDoc?.toObject === "function" ? userDoc.toObject() : { ...userDoc };

  return {
    ...userObject,
    password: undefined,
    hasPassword: Boolean(userObject?.password),
  };
};

const normalizeReferralValue = (value) =>
  String(value || "").trim().toUpperCase();

const validateReferralLinkContext = (referralCode, referralLinkCode) => {
  if (!referralCode) return null;

  if (!referralLinkCode) {
    return "Referral reward sirf shared invite link se signup par milega";
  }

  if (referralCode !== referralLinkCode) {
    return "Invite link aur entered referral code same hona chahiye";
  }

  return null;
};

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

    const { name, email, password, phone, referralCode, referralLinkCode } =
      validatedData.data;

    const existedUser = await User.findOne({ email });
    if (existedUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    let referrer = null;
    const normalizedReferralCode = normalizeReferralValue(referralCode);
    const normalizedReferralLinkCode = normalizeReferralValue(referralLinkCode);
    const referralContextError = validateReferralLinkContext(
      normalizedReferralCode,
      normalizedReferralLinkCode
    );
    if (referralContextError) {
      return res.status(400).json({
        success: false,
        message: referralContextError,
      });
    }

    if (normalizedReferralCode) {
      referrer = await User.findOne({ "referral.code": normalizedReferralCode });
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Referral code is invalid",
        });
      }
    }

    const newUser = new User({
      name,
      email,
      phone: phone || null,
      password: hashPassword,
      welcomeMailSent: false,
    });

    await ensureUserBenefits(newUser);

    if (referrer?._id) {
      newUser.referral.referredBy = referrer._id;
      creditWallet(newUser, {
        amount: REFERRAL_SIGNUP_BONUS,
        source: "referral_signup",
        title: "Referral welcome bonus",
        description: `Reward for joining with referral code ${normalizedReferralCode}`,
      });
    }

    await newUser.save();

    if (referrer?._id) {
      await ensureUserBenefits(referrer);
      creditWallet(referrer, {
        amount: REFERRAL_REFERRER_BONUS,
        source: "referral_invite",
        title: "Referral reward credited",
        description: `${newUser.name} joined with your referral code`,
      });
      referrer.referral.successfulReferrals += 1;
      referrer.referral.totalEarned += REFERRAL_REFERRER_BONUS;
      referrer.referral.rewards.unshift({
        userId: newUser._id,
        amount: REFERRAL_REFERRER_BONUS,
        title: `Referral signup reward for ${newUser.name}`,
        createdAt: new Date(),
      });
      await referrer.save();
    }

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

    await ensureUserBenefits(user);
    await user.save();

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
    await ensureAiUserMemory(user._id);
    return res.status(200).json({
      success: true,
      message: `Welcome back ${user.name}`,
      user: sanitizeUserForClient(user),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const firebaseGoogleLogin = async (req, res) => {
  try {
    const idToken = String(req.body?.idToken || "").trim();
    const referralCode = normalizeReferralValue(req.body?.referralCode);
    const referralLinkCode = normalizeReferralValue(req.body?.referralLinkCode);
    const referralContextError = validateReferralLinkContext(
      referralCode,
      referralLinkCode
    );

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase idToken is required",
      });
    }

    if (referralContextError) {
      return res.status(400).json({
        success: false,
        message: referralContextError,
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
    let referrer = null;

    if (user?.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    if (!user) {
      if (referralCode) {
        referrer = await User.findOne({ "referral.code": referralCode });
        if (!referrer) {
          return res.status(400).json({
            success: false,
            message: "Referral code is invalid",
          });
        }
      }

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

    await ensureUserBenefits(user);
    if (isNewUser && referrer?._id) {
      user.referral.referredBy = referrer._id;
      creditWallet(user, {
        amount: REFERRAL_SIGNUP_BONUS,
        source: "referral_signup",
        title: "Referral welcome bonus",
        description: `Reward for joining with referral code ${referralCode}`,
      });
    }
    await user.save();

    if (isNewUser && referrer?._id) {
      await ensureUserBenefits(referrer);
      creditWallet(referrer, {
        amount: REFERRAL_REFERRER_BONUS,
        source: "referral_invite",
        title: "Referral reward credited",
        description: `${user.name} joined with your referral code`,
      });
      referrer.referral.successfulReferrals += 1;
      referrer.referral.totalEarned += REFERRAL_REFERRER_BONUS;
      referrer.referral.rewards.unshift({
        userId: user._id,
        amount: REFERRAL_REFERRER_BONUS,
        title: `Referral signup reward for ${user.name}`,
        createdAt: new Date(),
      });
      await referrer.save();
    }
    setUserAuthCookies(res, user._id);
    await ensureAiUserMemory(user._id);
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
      user: sanitizeUserForClient(user),
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

    await ensureUserBenefits(user);
    await user.save();

    return res.status(200).json({
      success: true,
      user: sanitizeUserForClient(user),
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

    const parsedAddresses = normalizeAddresses(
      typeof addresses === "string" ? JSON.parse(addresses) : addresses
    );

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

export const updateUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const nextAddresses = normalizeAddresses(req.body?.addresses);
    if (!nextAddresses.length) {
      return res.status(400).json({
        success: false,
        message: "At least one valid address is required",
      });
    }

    user.addresses = nextAddresses;
    await ensureUserBenefits(user);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Addresses updated successfully",
      user: sanitizeUserForClient(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update addresses",
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

    user.resetOtp = createOtpHash(otp);
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

    if (!user.resetOtp || user.resetOtp !== createOtpHash(otp)) {
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
