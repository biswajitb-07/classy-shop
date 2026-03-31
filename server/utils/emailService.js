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
}) =>
  sendEmail({
    to,
    subject: `Delivery OTP • ${orderId}`,
    html: getDeliveryCompletionOtpEmailTemplate({
      name,
      orderId,
      otp,
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
