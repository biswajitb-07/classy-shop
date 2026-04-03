import jwt from "jsonwebtoken";
import { User } from "../../models/user/user.model.js";
import {
  clearUserAuthCookies,
  setUserAccessCookie,
} from "../../utils/authCookies.js";

const isAuthenticatedAdminUser = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    let userId = null;

    if (token) {
      try {
        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        userId = decode.userId;
      } catch (_error) {
        if (!refreshToken) {
          clearUserAuthCookies(res);
          return res.status(401).json({
            message: "Admin not authenticated",
            success: false,
          });
        }
      }
    }

    if (!userId) {
      if (!refreshToken) {
        clearUserAuthCookies(res);
        return res.status(401).json({
          message: "Admin not authenticated",
          success: false,
        });
      }

      try {
        const refreshDecode = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        userId = refreshDecode.userId;
        setUserAccessCookie(res, userId);
      } catch (_error) {
        clearUserAuthCookies(res);
        return res.status(401).json({
          message: "Session expired. Please login again",
          success: false,
        });
      }
    }

    const admin = await User.findById(userId).select("isBlocked role");
    if (!admin || admin.role !== "admin") {
      clearUserAuthCookies(res);
      return res.status(403).json({
        message: "Admin access only",
        success: false,
      });
    }

    if (admin.isBlocked) {
      clearUserAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    req.id = String(admin._id);
    req.role = "admin";
    next();
  } catch (_error) {
    clearUserAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Admin not authenticated",
    });
  }
};

export default isAuthenticatedAdminUser;
