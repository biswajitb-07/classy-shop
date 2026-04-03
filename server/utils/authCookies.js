import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";
const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

const ACCESS_TOKEN_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_AGE = 30 * 24 * 60 * 60 * 1000;

export const signUserAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: "15m" });

export const signUserRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: "30d" });

export const signVendorAccessToken = (vendorId) =>
  jwt.sign({ vendorId }, process.env.SECRET_KEY, { expiresIn: "15m" });

export const signVendorRefreshToken = (vendorId) =>
  jwt.sign({ vendorId }, process.env.SECRET_KEY, { expiresIn: "30d" });

export const signDeliveryAccessToken = (deliveryPartnerId) =>
  jwt.sign({ deliveryPartnerId }, process.env.SECRET_KEY, { expiresIn: "15m" });

export const signDeliveryRefreshToken = (deliveryPartnerId) =>
  jwt.sign({ deliveryPartnerId }, process.env.SECRET_KEY, { expiresIn: "30d" });

export const signAdminAccessToken = (adminId) =>
  jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: "15m" });

export const signAdminRefreshToken = (adminId) =>
  jwt.sign({ adminId }, process.env.SECRET_KEY, { expiresIn: "30d" });

export const signSocketToken = ({ userId, vendorId, deliveryPartnerId, adminId, role }) =>
  jwt.sign(
    {
      userId: userId || undefined,
      vendorId: vendorId || undefined,
      deliveryPartnerId: deliveryPartnerId || undefined,
      adminId: adminId || undefined,
      role,
      scope: "socket",
    },
    process.env.SECRET_KEY,
    { expiresIn: "10m" }
  );

export const setUserAccessCookie = (res, userId) =>
  res.cookie("accessToken", signUserAccessToken(userId), {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_AGE,
  });

export const setUserRefreshCookie = (res, userId) =>
  res.cookie("refreshToken", signUserRefreshToken(userId), {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_AGE,
  });

export const setVendorAccessCookie = (res, vendorId) =>
  res.cookie("vendorAccessToken", signVendorAccessToken(vendorId), {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_AGE,
  });

export const setVendorRefreshCookie = (res, vendorId) =>
  res.cookie("vendorRefreshToken", signVendorRefreshToken(vendorId), {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_AGE,
  });

export const setDeliveryAccessCookie = (res, deliveryPartnerId) =>
  res.cookie(
    "deliveryAccessToken",
    signDeliveryAccessToken(deliveryPartnerId),
    {
      ...baseCookieOptions,
      maxAge: ACCESS_TOKEN_AGE,
    }
  );

export const setDeliveryRefreshCookie = (res, deliveryPartnerId) =>
  res.cookie(
    "deliveryRefreshToken",
    signDeliveryRefreshToken(deliveryPartnerId),
    {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_AGE,
    }
  );

export const setAdminAccessCookie = (res, adminId) =>
  res.cookie("adminAccessToken", signAdminAccessToken(adminId), {
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_AGE,
  });

export const setAdminRefreshCookie = (res, adminId) =>
  res.cookie("adminRefreshToken", signAdminRefreshToken(adminId), {
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_AGE,
  });

export const setUserAuthCookies = (res, userId) => {
  setUserAccessCookie(res, userId);
  setUserRefreshCookie(res, userId);
};

export const setVendorAuthCookies = (res, vendorId) => {
  setVendorAccessCookie(res, vendorId);
  setVendorRefreshCookie(res, vendorId);
};

export const setDeliveryAuthCookies = (res, deliveryPartnerId) => {
  setDeliveryAccessCookie(res, deliveryPartnerId);
  setDeliveryRefreshCookie(res, deliveryPartnerId);
};

export const setAdminAuthCookies = (res, adminId) => {
  setAdminAccessCookie(res, adminId);
  setAdminRefreshCookie(res, adminId);
};

export const clearUserAuthCookies = (res) => {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
};

export const clearVendorAuthCookies = (res) => {
  res.clearCookie("vendorAccessToken", baseCookieOptions);
  res.clearCookie("vendorRefreshToken", baseCookieOptions);
};

export const clearDeliveryAuthCookies = (res) => {
  res.clearCookie("deliveryAccessToken", baseCookieOptions);
  res.clearCookie("deliveryRefreshToken", baseCookieOptions);
};

export const clearAdminAuthCookies = (res) => {
  res.clearCookie("adminAccessToken", baseCookieOptions);
  res.clearCookie("adminRefreshToken", baseCookieOptions);
};
