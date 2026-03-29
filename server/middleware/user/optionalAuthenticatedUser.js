import jwt from "jsonwebtoken";
import { User } from "../../models/user/user.model.js";
import { setUserAccessCookie } from "../../utils/authCookies.js";

const optionalAuthenticatedUser = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;
    let userId = null;

    if (token) {
      try {
        const decoded = await jwt.verify(token, process.env.SECRET_KEY);
        userId = decoded.userId;
      } catch {
        userId = null;
      }
    }

    if (!userId && refreshToken) {
      try {
        const refreshDecoded = await jwt.verify(refreshToken, process.env.SECRET_KEY);
        userId = refreshDecoded.userId;
        setUserAccessCookie(res, userId);
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      next();
      return;
    }

    const user = await User.findById(userId).select("isBlocked");
    if (!user || user.isBlocked) {
      next();
      return;
    }

    req.id = userId;
    req.role = "user";
    next();
  } catch {
    next();
  }
};

export default optionalAuthenticatedUser;
