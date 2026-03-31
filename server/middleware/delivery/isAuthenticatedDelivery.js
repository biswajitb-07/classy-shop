import jwt from "jsonwebtoken";
import { DeliveryPartner } from "../../models/delivery/deliveryPartner.model.js";
import {
  clearDeliveryAuthCookies,
  setDeliveryAccessCookie,
} from "../../utils/authCookies.js";

const isAuthenticatedDelivery = async (req, res, next) => {
  try {
    const token = req.cookies.deliveryAccessToken;
    const refreshToken = req.cookies.deliveryRefreshToken;
    let deliveryPartnerId = null;

    if (token) {
      try {
        const decoded = await jwt.verify(token, process.env.SECRET_KEY);
        deliveryPartnerId = decoded.deliveryPartnerId;
      } catch (error) {
        if (!refreshToken) {
          clearDeliveryAuthCookies(res);
          return res.status(401).json({
            success: false,
            message: "Delivery partner not authenticated",
          });
        }
      }
    }

    if (!deliveryPartnerId) {
      if (!refreshToken) {
        clearDeliveryAuthCookies(res);
        return res.status(401).json({
          success: false,
          message: "Delivery partner not authenticated",
        });
      }

      try {
        const refreshDecoded = await jwt.verify(
          refreshToken,
          process.env.SECRET_KEY
        );
        deliveryPartnerId = refreshDecoded.deliveryPartnerId;
        setDeliveryAccessCookie(res, deliveryPartnerId);
      } catch (error) {
        clearDeliveryAuthCookies(res);
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again",
        });
      }
    }

    req.id = deliveryPartnerId;
    req.role = "delivery";

    const deliveryPartner = await DeliveryPartner.findById(req.id).select(
      "isBlocked"
    );
    if (!deliveryPartner) {
      return res.status(401).json({
        success: false,
        message: "Delivery partner not authenticated",
      });
    }

    if (deliveryPartner.isBlocked) {
      clearDeliveryAuthCookies(res);
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    next();
  } catch (error) {
    clearDeliveryAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Delivery partner not authenticated",
    });
  }
};

export default isAuthenticatedDelivery;
