// File guide: emailTemplates source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
const APP_NAME = "Classy Shop";
const SUPPORT_EMAIL = process.env.SENDER_EMAIL || "support@classyshop.com";

const brandThemes = {
  user: {
    badge: "Customer Account",
    accent: "#2563eb",
    accentSoft: "#dbeafe",
    surface: "#eff6ff",
    heading: "Welcome to Classy Shop",
  },
  vendor: {
    badge: "Vendor Workspace",
    accent: "#db2777",
    accentSoft: "#fce7f3",
    surface: "#fff1f2",
    heading: "Welcome to Classy Shop Vendor",
  },
  otp: {
    badge: "Security Verification",
    accent: "#f59e0b",
    accentSoft: "#fef3c7",
    surface: "#fff7ed",
    heading: "Reset Password Request",
  },
  password: {
    badge: "Security Update",
    accent: "#059669",
    accentSoft: "#d1fae5",
    surface: "#ecfdf5",
    heading: "Password Updated",
  },
};

const buildEmailLayout = ({
  theme,
  preview,
  title,
  subtitle,
  body,
  footer,
}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${preview}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%);padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 24px 80px rgba(15,23,42,0.12);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,${theme.accent} 0%,#0f172a 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:32px 32px 28px 32px;">
                      <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.14);color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;">
                        ${theme.badge}
                      </div>
                      <h1 style="margin:18px 0 10px 0;color:#ffffff;font-size:34px;line-height:1.1;font-weight:800;">
                        ${title}
                      </h1>
                      <p style="margin:0;color:rgba(255,255,255,0.84);font-size:15px;line-height:24px;">
                        ${subtitle}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background:${theme.surface};padding:24px;">
                  <tr>
                    <td style="font-size:15px;line-height:26px;color:#1e293b;">
                      ${body}
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="font-size:13px;line-height:22px;color:#64748b;">
                      ${footer}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:18px 32px;background:#f8fafc;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px;line-height:20px;color:#64748b;">
                      ${APP_NAME}<br/>
                      Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:${theme.accent};text-decoration:none;font-weight:700;">${SUPPORT_EMAIL}</a>
                    </td>
                    <td align="right" style="font-size:12px;color:#94a3b8;">
                      Secure commerce notifications
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const getWelcomeEmailTemplate = ({ name, accountType = "user" }) => {
  const theme = brandThemes[accountType] || brandThemes.user;
  const accountLabel =
    accountType === "vendor" ? "vendor dashboard" : "shopping experience";

  return buildEmailLayout({
    theme,
    preview: `Welcome ${name} to ${APP_NAME}.`,
    title: theme.heading,
    subtitle: `Your ${accountLabel} is now active and ready to use.`,
    body: `
      <p style="margin:0 0 16px 0;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px 0;">
        Your account has been created successfully. You can now sign in and start exploring everything inside ${APP_NAME}.
      </p>
      <div style="border-radius:20px;background:#ffffff;padding:18px 20px;border:1px solid ${theme.accentSoft};">
        <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${theme.accent};">
          What you can do next
        </p>
        <p style="margin:0;">
          ${
            accountType === "vendor"
              ? "List products, monitor orders, and track dashboard analytics in one place."
              : "Browse products, save favorites, and place your next order with confidence."
          }
        </p>
      </div>
    `,
    footer:
      "If you did not create this account, please contact support right away so we can help secure it.",
  });
};

export const getResetOtpEmailTemplate = ({
  name,
  otp,
  accountType = "user",
}) => {
  const theme = brandThemes.otp;
  const persona = accountType === "vendor" ? "vendor account" : "account";

  return buildEmailLayout({
    theme,
    preview: `Your ${APP_NAME} password reset OTP is ${otp}.`,
    title: theme.heading,
    subtitle: `Use this one-time verification code to recover your ${persona}.`,
    body: `
      <p style="margin:0 0 16px 0;">Hi <strong>${name || "there"}</strong>,</p>
      <p style="margin:0 0 20px 0;">
        We received a request to reset your password. Use the OTP below to continue.
      </p>
      <div style="margin:0 0 20px 0;border-radius:24px;background:#ffffff;border:1px solid ${theme.accentSoft};padding:20px;text-align:center;">
        <p style="margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${theme.accent};">
          One Time Password
        </p>
        <p style="margin:0;font-size:34px;line-height:1;font-weight:800;letter-spacing:0.24em;color:#0f172a;">
          ${otp}
        </p>
      </div>
      <div style="border-radius:20px;background:#ffffff;padding:18px 20px;border:1px solid ${theme.accentSoft};">
        <p style="margin:0;">
          This OTP is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    `,
    footer:
      "For your security, never share this OTP with anyone. Our team will never ask for it by email or phone.",
  });
};

export const getPasswordChangedEmailTemplate = ({
  name,
  accountType = "user",
}) => {
  const theme = brandThemes.password;
  const accountLabel =
    accountType === "vendor" ? "vendor workspace" : "account";

  return buildEmailLayout({
    theme,
    preview: `Your ${APP_NAME} password was changed successfully.`,
    title: theme.heading,
    subtitle: `Your ${accountLabel} credentials were updated successfully.`,
    body: `
      <p style="margin:0 0 16px 0;">Hi <strong>${name || "there"}</strong>,</p>
      <p style="margin:0 0 18px 0;">
        This is a confirmation that your password has been changed successfully.
      </p>
      <div style="border-radius:20px;background:#ffffff;padding:18px 20px;border:1px solid ${theme.accentSoft};">
        <p style="margin:0;">
          If you made this change, there is nothing else you need to do. If this was not you, please reset your password immediately and contact support.
        </p>
      </div>
    `,
    footer:
      "Security tip: use a strong password that is unique to your Classy Shop account.",
  });
};
