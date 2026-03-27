import nodemailer from "nodemailer";

const cleanEnv = (value) => String(value || "").trim().replace(/^['"]|['"]$/g, "");

const smtpUser = cleanEnv(process.env.SMTP_USER);
const smtpPass = cleanEnv(process.env.SMTP_PASS);
const brevoApiKey = cleanEnv(process.env.BREVO_API_KEY || process.env.BREVO_KEY);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
  tls: {
    minVersion: "TLSv1.2",
  },
});

export const verifyEmailTransport = async () => {
  if (brevoApiKey) {
    console.log("Email transport ready via Brevo API.");
    return true;
  }

  if (!smtpUser || !smtpPass) {
    console.warn("Email transport skipped: SMTP_USER or SMTP_PASS is missing.");
    return false;
  }

  try {
    await transporter.verify();
    console.log("Email transport ready.");
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

export default transporter;
