import transporter from "./nodemailer.js";
import {
  getOrderOutForDeliveryEmailTemplate,
  getOrderPlacedEmailTemplate,
  getPasswordChangedEmailTemplate,
  getResetOtpEmailTemplate,
  getWelcomeEmailTemplate,
} from "./emailTemplates.js";

const sendEmail = async ({ to, subject, html }) =>
  transporter.sendMail({
    from: process.env.SENDER_EMAIL || process.env.SMTP_USER,
    to,
    subject,
    html,
  });

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
