import jwt from "jsonwebtoken";
import { Admin } from "../../models/admin/admin.model.js";
import {
  clearAdminAuthCookies,
  setAdminAccessCookie,
} from "../../utils/authCookies.js";

const isAuthenticatedAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminAccessToken;
    const refreshToken = req.cookies.adminRefreshToken;
    let adminId = null;

    if (token) {
      try {
        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        adminId = decode.adminId;
      } catch (_error) {
        if (!refreshToken) {
          clearAdminAuthCookies(res);
          return res.status(401).json({
            message: "Admin not authenticated",
            success: false,
          });
        }
      }
    }

    if (!adminId) {
      if (!refreshToken) {
        clearAdminAuthCookies(res);
        return res.status(401).json({
          message: "Admin not authenticated",
          success: false,
        });
      }

      try {
        const refreshDecode = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        adminId = refreshDecode.adminId;
        setAdminAccessCookie(res, adminId);
      } catch (_error) {
        clearAdminAuthCookies(res);
        return res.status(401).json({
          message: "Session expired. Please login again",
          success: false,
        });
      }
    }

    const admin = await Admin.findById(adminId).select("isBlocked");
    if (!admin) {
      clearAdminAuthCookies(res);
      return res.status(403).json({
        message: "Admin access only",
        success: false,
      });
    }

    if (admin.isBlocked) {
      clearAdminAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    req.id = String(admin._id);
    req.role = "admin";
    next();
  } catch (_error) {
    clearAdminAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Admin not authenticated",
    });
  }
};

export default isAuthenticatedAdmin;
