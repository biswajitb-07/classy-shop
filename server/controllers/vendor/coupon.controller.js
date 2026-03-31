import { Coupon } from "../../models/marketing/coupon.model.js";

const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

export const getCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, coupons });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to load coupons" });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      usageLimit,
      startsAt,
      expiresAt,
    } = req.body;

    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode || !title || !discountType) {
      return res.status(400).json({
        success: false,
        message: "Code, title, and discount type are required",
      });
    }

    if (!["percentage", "fixed"].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: "Discount type must be percentage or fixed",
      });
    }

    const numericDiscountValue = Number(discountValue);
    if (!Number.isFinite(numericDiscountValue) || numericDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be greater than 0",
      });
    }

    if (discountType === "percentage" && numericDiscountValue > 100) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100",
      });
    }

    const exists = await Coupon.findOne({ code: normalizedCode }).lean();
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Coupon code already exists",
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      title: String(title).trim(),
      description: String(description || "").trim(),
      discountType,
      discountValue: numericDiscountValue,
      minOrderAmount: Number(minOrderAmount || 0),
      maxDiscountAmount:
        maxDiscountAmount === "" || maxDiscountAmount === null
          ? null
          : Number(maxDiscountAmount),
      usageLimit:
        usageLimit === "" || usageLimit === null ? null : Number(usageLimit),
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.id,
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
};

export const toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    return res.status(200).json({
      success: true,
      message: `Coupon ${coupon.isActive ? "activated" : "disabled"}`,
      coupon,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to update coupon status" });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res
        .status(404)
        .json({ success: false, message: "Coupon not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Coupon deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete coupon" });
  }
};
