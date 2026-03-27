import { Resend } from "resend";
import {
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const resendApiKey = cleanEnv(process.env.RESEND_API_KEY);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const getFromAddress = () => {
  const senderEmail = cleanEnv(process.env.SENDER_EMAIL);

  return senderEmail ? `Classy Store <${senderEmail}>` : undefined;
};

const sendViaResendApi = async ({ to, subject, html }) => {
  const from = getFromAddress();

  if (!resend || !from) {
    throw new Error(
      "Resend email is not configured. Please set RESEND_API_KEY and SENDER_EMAIL."
    );
  }

  return resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });
};

export const verifyEmailTransport = async () => {
  if (!resendApiKey) {
    console.warn("Email transport skipped: RESEND_API_KEY is missing.");
    return false;
  }

  if (!getFromAddress()) {
    console.warn("Email transport skipped: SENDER_EMAIL is missing.");
    return false;
  }

  console.log("Email transport ready via Resend API.");
  return true;
};

const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();

  if (!from || !resendApiKey) {
    throw new Error(
      "Email is not configured. Please set RESEND_API_KEY and SENDER_EMAIL."
    );
  }

  try {
    return await sendViaResendApi({ to, subject, html });
  } catch (error) {
    console.error("Email send failed:", {
      to,
      subject,
      from,
      message: error?.message,
      code: error?.code,
      name: error?.name,
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
