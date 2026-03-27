import transporter from "./nodemailer.js";
import {
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const getFromAddress = () => {
  const senderEmail =
    cleanEnv(process.env.SENDER_EMAIL) ||
    cleanEnv(process.env.SMTP_SENDER) ||
    cleanEnv(process.env.SMTP_USER);

  return senderEmail ? `Classy Store <${senderEmail}>` : undefined;
};

const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();
  const smtpUser = cleanEnv(process.env.SMTP_USER);
  const smtpPass = cleanEnv(process.env.SMTP_PASS);

  if (!from || !smtpUser || !smtpPass) {
    throw new Error(
      "Email is not configured. Please set SMTP_USER, SMTP_PASS, and SENDER_EMAIL."
    );
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error("Email send failed:", {
      to,
      subject,
      from,
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
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
