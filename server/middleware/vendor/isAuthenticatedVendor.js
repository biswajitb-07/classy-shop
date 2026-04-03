import jwt from "jsonwebtoken";
import { Vendor } from "../../models/vendor/vendor.model.js";
import { clearVendorAuthCookies, setVendorAccessCookie } from "../../utils/authCookies.js";

const isAuthenticatedVendor = async (req, res, next) => {
  try {
    const token = req.cookies.vendorAccessToken;
    const refreshToken = req.cookies.vendorRefreshToken;
    let vendorId = null;

    if (token) {
      try {
        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        vendorId = decode.vendorId;
      } catch (error) {
        if (!refreshToken) {
          clearVendorAuthCookies(res);
          return res.status(401).json({
            message: "Vendor not authenticated",
            success: false,
          });
        }
      }
    }

    if (!vendorId) {
      if (!refreshToken) {
        clearVendorAuthCookies(res);
        return res.status(401).json({
          message: "Vendor not authenticated",
          success: false,
        });
      }

      try {
        const refreshDecode = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        vendorId = refreshDecode.vendorId;
        setVendorAccessCookie(res, vendorId);
      } catch (error) {
        clearVendorAuthCookies(res);
        return res.status(401).json({
          message: "Session expired. Please login again",
          success: false,
        });
      }
    }

    req.id = vendorId;

    const vendor = await Vendor.findById(req.id).select("isBlocked role");
    if (!vendor) {
      return res.status(401).json({
        message: "Vendor not authenticated",
        success: false,
      });
    }
    if (vendor.isBlocked) {
      clearVendorAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    req.role = vendor.role || "vendor";

    next();
  } catch (error) {
    console.log(error);
    clearVendorAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Vendor not authenticated",
    });
  }
};
export default isAuthenticatedVendor;
