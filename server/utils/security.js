import crypto from "crypto";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
];

export const getAllowedOrigins = ({ isProduction = false } = {}) =>
  [
    process.env.USER_URL,
    process.env.VENDOR_URL,
    process.env.DELIVERY_URL,
    ...(isProduction ? [] : defaultDevOrigins),
  ].filter(Boolean);

const normalizeOrigin = (value) => {
  if (!value) return "";

  try {
    return new URL(value).origin;
  } catch (_error) {
    return "";
  }
};

export const requireTrustedOrigin = (allowedOrigins = []) => (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const originHeader = req.get("origin");
  const refererHeader = req.get("referer");
  const requestOrigin = normalizeOrigin(originHeader) || normalizeOrigin(refererHeader);

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Request origin is not allowed",
  });
};

export const applyBasicSecurityHeaders = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
};

export const createOtpHash = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

export const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 10,
  keyGenerator,
  message = "Too many requests, please try again later.",
} = {}) => {
  const store = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key =
      keyGenerator?.(req) ||
      `${req.ip || req.headers["x-forwarded-for"] || "unknown"}:${req.path}`;

    const record = store.get(key);
    if (!record || record.expiresAt <= now) {
      store.set(key, { count: 1, expiresAt: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    record.count += 1;
    store.set(key, record);
    return next();
  };
};
