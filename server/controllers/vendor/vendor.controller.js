import { Vendor } from "../../models/vendor/vendor.model.js";
import bcrypt from "bcryptjs";
import { generateTokenVendor } from "../../utils/generateTokenVendor.js";
import { loginSchema } from "../../validation/vendor/vendor.validation.js";
import {
  deleteMediaFromCloudinary,
  uploadMediaVendor,
} from "../../utils/cloudinary.js";
import transporter from "../../utils/nodemailer.js";

// export const register = async (req, res) => {
//   try {
//     const validatedData = registerSchema.safeParse(req.body);
//     if (!validatedData.success) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation failed",
//         errors: validatedData.error.flatten(),
//       });
//     }

//     const { name, email, password } = validatedData.data;

//     const existedVendor = await Vendor.findOne({ email });
//     if (existedVendor) {
//       return res.status(409).json({
//         success: false,
//         message: "Email already exists",
//       });
//     }

//     const salt = await bcrypt.genSalt(10);
//     const hashPassword = await bcrypt.hash(password, salt);

//     const newVendor = new Vendor({
//       name,
//       email,
//       password: hashPassword,
//     });

//     await newVendor.save();

//     return res.status(201).json({
//       success: true,
//       message: "Registration successful",
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

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

    const isPasswordMatch = await bcrypt.compare(password, vendor.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    generateTokenVendor(res, vendor, `Welcom back ${vendor.name}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token1", {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 0,
    });

    // Send a success response
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
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: vendor.email,
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
                            Hi ${vendor.name || ""},
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

    const vendor = await Vendor.findOne(email);

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    vendor.resetOtp = otp;
    vendor.resetOtpExpireAt = Date.now() + 15 * 60 * 1000;

    await vendor.save();

    const mailOption = {
      from: process.env.GMAIL_USER,
      to: vendor.email,
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
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: vendor.email,
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
                            Hi ${vendor.name || ""},
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
