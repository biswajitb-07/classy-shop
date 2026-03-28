import nodemailer from "nodemailer";
import {
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");
const gmailUser = cleanEnv(process.env.GMAIL_USER);
const gmailPass = cleanEnv(process.env.GMAIL_PASS);

const transporter =
  gmailUser && gmailPass
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      })
    : null;

const getFromAddress = () => {
  const senderEmail = cleanEnv(process.env.SENDER_EMAIL) || gmailUser;

  return senderEmail ? `Classy Store <${senderEmail}>` : undefined;
};

const sendViaGmailSmtp = async ({ to, subject, html }) => {
  const from = getFromAddress();

  if (!transporter || !from) {
    throw new Error(
      "Gmail SMTP is not configured. Please set GMAIL_USER, GMAIL_PASS, and SENDER_EMAIL."
    );
  }

  return transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const verifyEmailTransport = async () => {
  if (!gmailUser || !gmailPass) {
    console.warn("Email transport skipped: GMAIL_USER or GMAIL_PASS is missing.");
    return false;
  }

  if (!getFromAddress()) {
    console.warn("Email transport skipped: SENDER_EMAIL is missing.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("Email transport ready via Gmail SMTP.");
    return true;
  } catch (error) {
    console.error("Email transport verification failed:", {
      message: error?.message,
      code: error?.code,
      response: error?.response,
      responseCode: error?.responseCode,
    });
    return false;
  }
};

const sendEmail = async ({ to, subject, html }) => {
  const from = getFromAddress();

  if (!from || !gmailUser || !gmailPass) {
    throw new Error(
      "Email is not configured. Please set GMAIL_USER, GMAIL_PASS, and SENDER_EMAIL."
    );
  }

  try {
    return await sendViaGmailSmtp({ to, subject, html });
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
