import { Resend } from "resend";

import {
  getDeliveryCompletionOtpEmailTemplate,
  getOrderDeliveredEmailTemplate,
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
const senderEmail = cleanEnv(process.env.SENDER_EMAIL);

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const getFromAddress = () =>
  senderEmail ? `Classy Store <${senderEmail}>` : undefined;

export const verifyEmailTransport = async () => {
  if (!resendApiKey) {
    console.warn("Email transport skipped: RESEND_API_KEY is missing.");
    return false;
  }

  if (!senderEmail) {
    console.warn("Email transport skipped: SENDER_EMAIL is missing.");
    return false;
  }

  console.log("Email transport ready via Resend API.");
  return true;
};

const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();

  if (!resend || !from) {
    throw new Error(
      "Email is not configured. Please set RESEND_API_KEY and SENDER_EMAIL.",
    );
  }

  try {
    return await resend.emails.send({
      from,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Email send failed:", {
      to,
      subject,
      from,
      message: error?.message,
      name: error?.name,
      statusCode: error?.statusCode,
    });

    throw error;
  }
};

export const sendWelcomeEmail = async ({ to, name, accountType = "user" }) =>
  sendEmail({
    to,
    subject:
      accountType === "vendor"
        ? "Welcome to Classy Shop Vendor"
        : "Welcome to Classy Shop",
    html: getWelcomeEmailTemplate({ name, accountType }),
  });

export const sendResetOtpEmail = async ({
  to,
  name,
  otp,
  accountType = "user",
}) =>
  sendEmail({
    to,
    subject: "Password Reset OTP",
    html: getResetOtpEmailTemplate({ name, otp, accountType }),
  });

export const sendPasswordChangedEmail = async ({
  to,
  name,
  accountType = "user",
}) =>
  sendEmail({
    to,
    subject: "Password Changed Successfully",
    html: getPasswordChangedEmailTemplate({ name, accountType }),
  });

export const sendOrderPlacedEmail = async ({
  to,
  name,
  orderId,
  paymentMethod,
  totalAmount,
  shippingAddress,
  items,
}) =>
  sendEmail({
    to,
    subject: `Order Confirmed • ${orderId}`,
    html: getOrderPlacedEmailTemplate({
      name,
      orderId,
      paymentMethod,
      totalAmount,
      shippingAddress,
      items,
    }),
  });

export const sendOrderOutForDeliveryEmail = async ({
  to,
  name,
  orderId,
  totalAmount,
  items,
}) =>
  sendEmail({
    to,
    subject: `Out for Delivery • ${orderId}`,
    html: getOrderOutForDeliveryEmailTemplate({
      name,
      orderId,
      totalAmount,
      items,
    }),
  });

export const sendDeliveryCompletionOtpEmail = async ({
  to,
  name,
  orderId,
  otp,
  purpose = "delivery",
}) =>
  sendEmail({
    to,
    subject: `${
      purpose === "return" ? "Return Pickup OTP" : "Delivery OTP"
    } • ${orderId}`,
    html: getDeliveryCompletionOtpEmailTemplate({
      name,
      orderId,
      otp,
      purpose,
    }),
  });

export const sendOrderDeliveredEmail = async ({
  to,
  name,
  orderId,
  totalAmount,
  items,
}) =>
  sendEmail({
    to,
    subject: `Delivered • ${orderId}`,
    html: getOrderDeliveredEmailTemplate({
      name,
      orderId,
      totalAmount,
      items,
    }),
  });

export const sendPayoutStatusEmail = async ({
  to,
  name,
  accountType = "vendor",
  amount = 0,
  status = "approved",
  note = "",
}) =>
  sendEmail({
    to,
    subject: `Payout ${String(status || "").toUpperCase()} • Classy Shop`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">${accountType} payout update</p>
          <h1 style="margin:0 0 14px;font-size:28px;">Hello ${String(name || "Partner")},</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569;">
            Your payout request has been updated.
          </p>
          <div style="border:1px solid #e2e8f0;border-radius:16px;padding:18px;background:#f8fafc;">
            <p style="margin:0 0 10px;font-size:14px;color:#64748b;">Status</p>
            <p style="margin:0 0 14px;font-size:22px;font-weight:700;text-transform:capitalize;color:#0f172a;">${String(status || "")}</p>
            <p style="margin:0 0 10px;font-size:14px;color:#64748b;">Amount</p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#0f172a;">Rs ${Number(amount || 0).toLocaleString("en-IN")}</p>
          </div>
          ${
            note
              ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#475569;"><strong>Admin note:</strong> ${String(
                  note
                )}</p>`
              : ""
          }
          <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#475569;">
            You can also check the latest payout status directly from your dashboard.
          </p>
        </div>
      </div>
    `,
  });
