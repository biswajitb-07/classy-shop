import jwt from "jsonwebtoken";
import { Vendor } from "../../models/vendor/vendor.model.js";
import { clearVendorAuthCookies, setVendorAccessCookie } from "../../utils/authCookies.js";

const isAuthenticatedAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.vendorAccessToken;
    const refreshToken = req.cookies.vendorRefreshToken;
    let vendorId = null;

    if (token) {
      try {
        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        vendorId = decode.vendorId;
      } catch (_error) {
        if (!refreshToken) {
          clearVendorAuthCookies(res);
          return res.status(401).json({
            message: "Admin not authenticated",
            success: false,
          });
        }
      }
    }

    if (!vendorId) {
      if (!refreshToken) {
        clearVendorAuthCookies(res);
        return res.status(401).json({
          message: "Admin not authenticated",
          success: false,
        });
      }

      try {
        const refreshDecode = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        vendorId = refreshDecode.vendorId;
        setVendorAccessCookie(res, vendorId);
      } catch (_error) {
        clearVendorAuthCookies(res);
        return res.status(401).json({
          message: "Session expired. Please login again",
          success: false,
        });
      }
    }

    const admin = await Vendor.findById(vendorId).select("isBlocked role");
    if (!admin || admin.role !== "admin") {
      clearVendorAuthCookies(res);
      return res.status(403).json({
        message: "Admin access only",
        success: false,
      });
    }

    if (admin.isBlocked) {
      clearVendorAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    req.id = String(admin._id);
    req.role = "admin";
    next();
  } catch (error) {
    clearVendorAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Admin not authenticated",
    });
  }
};

export default isAuthenticatedAdmin;
