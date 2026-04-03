import jwt from "jsonwebtoken";
import { User } from "../../models/user/user.model.js";
import { clearUserAuthCookies, setUserAccessCookie } from "../../utils/authCookies.js";

const isAuthenticatedUser = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    let userId = null;

    if (token) {
      try {
        const decode = await jwt.verify(token, process.env.SECRET_KEY);
        userId = decode.userId;
      } catch (error) {
        if (!refreshToken) {
          clearUserAuthCookies(res);
          return res.status(401).json({
            message: "User not authenticated",
            success: false,
          });
        }
      }
    }

    if (!userId) {
      if (!refreshToken) {
        clearUserAuthCookies(res);
        return res.status(401).json({
          message: "User not authenticated",
          success: false,
        });
      }

      try {
        const refreshDecode = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        userId = refreshDecode.userId;
        setUserAccessCookie(res, userId);
      } catch (error) {
        clearUserAuthCookies(res);
        return res.status(401).json({
          message: "Session expired. Please login again",
          success: false,
        });
      }
    }

    req.id = userId;

    const user = await User.findById(req.id).select("isBlocked role");
    if (!user) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }
    if (user.role !== "user") {
      clearUserAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "User access only",
      });
    }
    if (user.isBlocked) {
      clearUserAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked plz contact customer care",
      });
    }

    req.role = "user";

    next();
  } catch (error) {
    console.log(error);
    clearUserAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "User not authenticated",
    });
  }
};
export default isAuthenticatedUser;
