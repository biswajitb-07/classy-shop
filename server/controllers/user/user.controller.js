import { User } from "../../models/user/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../../utils/generateToken.js";
import {
  registerSchema,
  loginSchema,
} from "../../validation/user/user.validation.js";
import {
  deleteMediaFromCloudinary,
  uploadMedia,
} from "../../utils/cloudinary.js";
import transporter from "../../utils/nodemailer.js";

export const register = async (req, res) => {
  try {
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
      welcomeMailSent: true,
    });

    await newUser.save();

    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: newUser.email,
        subject: "🎉 Welcome to Falcon Store!",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Welcome</title>
            </head>
            <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f7f7f7;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
                <tr>
                  <td align="center" style="padding:40px 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                      <tr>
                        <td style="background:#3b82f6;padding:24px 30px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">
                          Welcome to Falcon Store!
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px;">
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0 0 20px;">
                            Hi ${name},
                          </p>
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0;">
                            Your account has been created successfully. You can now log in and start shopping!
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f3f4f6;padding:20px 30px;text-align:center;font-size:12px;color:#888888;">
                          Need help? <a href="mailto:${process.env.GMAIL_USER}" style="color:#3b82f6;text-decoration:none;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch (mailErr) {
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

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    generateToken(res, user, `Welcome back ${user.name}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  const isProd = process.env.NODE_ENV === "production";
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });
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

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        message: "Profile not found",
        success: false,
      });
    }

    return res.status(200).json({
      success: true,
      user,
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
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: "✅ Password Changed Successfully",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Password Changed</title>
            </head>
            <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f7f7f7;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
                <tr>
                  <td align="center" style="padding:40px 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                      <tr>
                        <td style="background:#10b981;padding:24px 30px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">
                          Password Changed
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px;">
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0 0 20px;">
                            Hi ${user.name || ""},
                          </p>
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0;">
                            Your password has been updated successfully. If you did not make this change, please contact support immediately.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f3f4f6;padding:20px 30px;text-align:center;font-size:12px;color:#888888;">
                          Need help? <a href="mailto:${
                            process.env.GMAIL_USER
                          }" style="color:#10b981;text-decoration:none;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
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

    const mailOption = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "🔐 Password Reset Request",
      html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Password</title>
      </head>
      <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f7f7f7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
          <tr>
            <td align="center" style="padding:40px 10px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                <!-- Header -->
                <tr>
                  <td style="background:#f59e0b;padding:24px 30px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">
                    Reset Your Password
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:30px;">
                    <p style="font-size:16px;color:#333333;line-height:24px;margin:0 0 20px;">
                      Hi there,
                    </p>
                    <p style="font-size:16px;color:#333333;line-height:24px;margin:0 0 20px;">
                      You requested a password reset. Please use the OTP below to proceed:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding:20px 0;">
                          <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:28px;font-weight:bold;padding:12px 24px;border-radius:6px;letter-spacing:4px;">
                            ${otp}
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="font-size:14px;color:#666666;line-height:22px;margin:0 0 10px;">
                      This OTP is valid for <strong>15 minutes</strong>. If you didn’t request this, simply ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f3f4f6;padding:20px 30px;text-align:center;font-size:12px;color:#888888;">
                    Need help? <a href="mailto:support@yourapp.com" style="color:#f59e0b;text-decoration:none;">Contact Support</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
    };

    await transporter.sendMail(mailOption);

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
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: user.email,
        subject: "✅ Password Changed Successfully",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1.0" />
              <title>Password Changed</title>
            </head>
            <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f7f7f7;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
                <tr>
                  <td align="center" style="padding:40px 10px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:500px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                      <tr>
                        <td style="background:#10b981;padding:24px 30px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">
                          Password Changed
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px;">
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0 0 20px;">
                            Hi ${user.name || ""},
                          </p>
                          <p style="font-size:16px;color:#333333;line-height:24px;margin:0;">
                            Your password has been updated successfully. If you did not make this change, please contact support immediately.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f3f4f6;padding:20px 30px;text-align:center;font-size:12px;color:#888888;">
                          Need help? <a href="mailto:${
                            process.env.GMAIL_USER
                          }" style="color:#10b981;text-decoration:none;">Contact Support</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
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
