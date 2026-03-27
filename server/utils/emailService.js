import transporter from "./nodemailer.js";
import {
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const getFromAddress = () => {
  const senderEmail =
    cleanEnv(process.env.SENDER_EMAIL) ||
    cleanEnv(process.env.SMTP_SENDER) ||
    cleanEnv(process.env.SMTP_USER);

  return senderEmail ? `Classy Store <${senderEmail}>` : undefined;
};

const parseSender = () => {
  const senderEmail =
    cleanEnv(process.env.SENDER_EMAIL) ||
    cleanEnv(process.env.SMTP_SENDER) ||
    cleanEnv(process.env.SMTP_USER);

  return senderEmail
    ? {
        name: "Classy Store",
        email: senderEmail,
      }
    : null;
};

const sendViaBrevoApi = async ({ to, subject, html }) => {
  const apiKey = cleanEnv(process.env.BREVO_API_KEY || process.env.BREVO_KEY);
  const sender = parseSender();

  if (!apiKey || !sender) {
    throw new Error(
      "Brevo API email is not configured. Please set BREVO_API_KEY and SENDER_EMAIL."
    );
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    let details = "";

    try {
      details = await response.text();
    } catch {
      details = "";
    }

    const error = new Error(
      `Brevo API request failed with status ${response.status}${details ? `: ${details}` : ""}`
    );
    error.responseCode = response.status;
    error.response = details;
    throw error;
  }

  return response.json().catch(() => ({}));
};

const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();
  const smtpUser = cleanEnv(process.env.SMTP_USER);
  const smtpPass = cleanEnv(process.env.SMTP_PASS);
  const brevoApiKey = cleanEnv(process.env.BREVO_API_KEY || process.env.BREVO_KEY);

  if (!from || (!brevoApiKey && (!smtpUser || !smtpPass))) {
    throw new Error(
      "Email is not configured. Please set SENDER_EMAIL and either SMTP_USER/SMTP_PASS or BREVO_API_KEY."
    );
  }

  try {
    if (brevoApiKey) {
      return await sendViaBrevoApi({ to, subject, html });
    }

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

    if (brevoApiKey && (smtpUser || smtpPass)) {
      throw error;
    }

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
