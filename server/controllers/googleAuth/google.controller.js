import bcrypt from "bcryptjs";
import { User } from "../../models/user/user.model.js";
import transporter from "../../utils/nodemailer.js";
import { setUserAuthCookies } from "../../utils/authCookies.js";

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
        await transporter.sendMail({
          from: process.env.SENDER_EMAIL,
          to: freshUser.email,
          subject: "🎉 Welcome to Falcon Shop – Google Login",
          html: `
            <!DOCTYPE html>
            <html>
              <body style="margin:0;padding:0;font-family:Arial;background:#f7f7f7;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
                  <tr>
                    <td align="center" style="padding:40px 10px;">
                      <table style="max-width:500px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                        <tr>
                          <td style="background:#3b82f6;padding:24px;color:#fff;font-size:22px;font-weight:bold;text-align:center;">
                            Welcome to Falcon Shop!
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:30px;">
                            <p style="font-size:16px;color:#333;line-height:24px;margin:0 0 15px;">
                              Hi ${freshUser.name},
                            </p>
                            <p style="font-size:16px;color:#333;line-height:24px;margin:0;">
                              You have successfully logged in with Google for the first time. Enjoy shopping!
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="background:#f3f4f6;padding:20px;font-size:12px;color:#888;text-align:center;">
                            Need help? <a href="mailto:${process.env.SENDER_EMAIL}" style="color:#3b82f6;text-decoration:none;">Contact Support</a>
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
      await transporter.sendMail({
        from: process.env.SENDER_EMAIL,
        to: user.email,
        subject: "🔐 Password Successfully Set",
        html: `
          <!DOCTYPE html>
          <html>
            <body style="margin:0;padding:0;font-family:Arial;background:#f7f7f7;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;">
                <tr>
                  <td align="center" style="padding:40px 10px;">
                    <table style="max-width:500px;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);">
                      <tr>
                        <td style="background:#10b981;padding:24px;color:#fff;font-size:22px;font-weight:bold;text-align:center;">
                          Password Set Successfully
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:30px;">
                          <p style="font-size:16px;color:#333;line-height:24px;margin:0;">
                            Hi ${user.name},<br><br>
                            Your account password has been set. You can now log in with your new password.
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#f3f4f6;padding:20px;font-size:12px;color:#888;text-align:center;">
                          Need help? <a href="mailto:${process.env.SENDER_EMAIL}" style="color:#10b981;text-decoration:none;">Contact Support</a>
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
      console.error("Password-set mail error:", mailErr);
    }

    res.json({ success: true, message: "Password set successfully" });
  } catch (error) {
    console.error("Set-password error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
