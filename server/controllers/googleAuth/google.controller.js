import bcrypt from "bcryptjs";
import { User } from "../../models/user/user.model.js";
import { setUserAuthCookies } from "../../utils/authCookies.js";
import {
  sendPasswordChangedEmail,
  sendWelcomeEmail,
} from "../../utils/emailService.js";

const getUserFrontendUrl = () =>
  process.env.USER_URL || process.env.FRONTEND_URL || "http://localhost:3000";

export const googleAuth = async (req, res) => {
  try {
    if (!req.user) throw new Error("No user returned from Google");

    const freshUser = await User.findById(req.user._id);
    if (freshUser?.isBlocked) {
      return res.redirect(
        `${getUserFrontendUrl()}/login?blocked=1&google=blocked&message=${encodeURIComponent("Your account has been blocked plz contact customer care")}`
      );
    }

    setUserAuthCookies(res, freshUser._id);

    if (!freshUser.welcomeMailSent) {
      try {
        await sendWelcomeEmail({
          to: freshUser.email,
          name: freshUser.name,
          accountType: "user",
        });

        await User.updateOne(
          { _id: freshUser._id },
          { $set: { welcomeMailSent: true } }
        );
      } catch (mailErr) {
        console.error("Google welcome mail error:", mailErr);
      }
    }

    return res.redirect(`${getUserFrontendUrl()}/`);
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.redirect(
      `${getUserFrontendUrl()}/?google=error&message=Google%20login%20failed`
    );
  }
};

export const googlePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password)
      return res
        .status(400)
        .json({ success: false, message: "Password required" });

    const user = await User.findById(req.id);
    if (!user)
      return res.status(403).json({ success: false, message: "Forbidden" });
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.isGoogleUser = true;
    await user.save();

    try {
      await sendPasswordChangedEmail({
        to: user.email,
        name: user.name,
        accountType: "user",
      });
    } catch (mailErr) {
      console.error("Password-set mail error:", mailErr);
    }

    res.json({ success: true, message: "Password set successfully" });
  } catch (error) {
    console.error("Set-password error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
