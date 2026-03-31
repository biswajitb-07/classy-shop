import mongoose from "mongoose";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Electronics from "../../models/vendor/electronic/electronic.model.js";
import Bag from "../../models/vendor/bag/bag.model.js";
import Footwear from "../../models/vendor/footwear/footwear.model.js";
import Grocery from "../../models/vendor/grocery/grocery.model.js";
import Beauty from "../../models/vendor/beauty/beauty.model.js";
import Wellness from "../../models/vendor/wellness/wellness.model.js";
import Jewellery from "../../models/vendor/jewellery/jewellery.model.js";
import Order from "../../models/user/order.model.js";
import { ProductReview } from "../../models/user/productReview.model.js";

const productRegistry = {
  fashion: {
    productType: "Fashion",
    model: Fashion,
  },
  electronics: {
    productType: "Electronics",
    model: Electronics,
  },
  electronic: {
    productType: "Electronics",
    model: Electronics,
  },
  bag: {
    productType: "Bag",
    model: Bag,
  },
  footwear: {
    productType: "Footwear",
    model: Footwear,
  },
  grocery: {
    productType: "Grocery",
    model: Grocery,
  },
  beauty: {
    productType: "Beauty",
    model: Beauty,
  },
  wellness: {
    productType: "Wellness",
    model: Wellness,
  },
  jewellery: {
    productType: "Jewellery",
    model: Jewellery,
  },
};

const normalizeProductType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const resolveProductContext = (productType) =>
  productRegistry[normalizeProductType(productType)] || null;

const serializeReview = (review) => ({
  _id: review._id,
  rating: review.rating,
  title: review.title || "",
  comment: review.comment,
  isVerifiedPurchase: Boolean(review.isVerifiedPurchase),
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
  user: review.userId
    ? {
        _id: review.userId._id,
        name: review.userId.name,
        photoUrl: review.userId.photoUrl || "",
      }
    : null,
});

const validateReviewInput = ({ productId, productType, rating, comment }) => {
  if (!mongoose.isValidObjectId(productId)) {
    return "Valid product id is required";
  }

  if (!resolveProductContext(productType)) {
    return "Invalid product type";
  }

  const numericRating = Number(rating);
  if (
    !Number.isFinite(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return "Rating must be between 1 and 5";
  }

  if (!String(comment || "").trim()) {
    return "Review comment is required";
  }

  return null;
};

const syncProductReviewStats = async ({ productId, productType }) => {
  const context = resolveProductContext(productType);
  if (!context) return;

  const product = await context.model
    .findById(productId)
    .select("rating baseRating")
    .lean();
  if (!product) return;

  const aggregate = await ProductReview.aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(productId),
        productType: context.productType,
      },
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const summary = aggregate[0] || {
    averageRating: 0,
    totalReviews: 0,
  };

  const normalizedBaseRating =
    product.baseRating !== null && product.baseRating !== undefined
      ? Number(product.baseRating || 0)
      : Number(product.rating || 0);
  const baseWeight = normalizedBaseRating > 0 ? 1 : 0;
  const blendedRating =
    Number(summary.totalReviews || 0) > 0
      ? Number(
          (
            ((Number(summary.averageRating || 0) * Number(summary.totalReviews || 0)) +
              normalizedBaseRating * baseWeight) /
            (Number(summary.totalReviews || 0) + baseWeight)
          ).toFixed(1)
        )
      : normalizedBaseRating;

  await context.model.findByIdAndUpdate(productId, {
    baseRating:
      product.baseRating !== null && product.baseRating !== undefined
        ? product.baseRating
        : normalizedBaseRating,
    rating: blendedRating,
    reviews: Number(summary.totalReviews || 0),
  });
};

const getDeliveredPurchase = async ({ userId, productId, productType }) => {
  const context = resolveProductContext(productType);
  if (!context) return null;

  return Order.findOne({
    userId,
    orderStatus: "delivered",
    items: {
      $elemMatch: {
        productId,
        productType: context.productType,
      },
    },
  })
    .select("_id orderId")
    .lean();
};

const loadProductSummary = async ({ productId, productType }) => {
  const context = resolveProductContext(productType);
  if (!context) return null;

  const product = await context.model
    .findById(productId)
    .select("name rating reviews")
    .lean();

  if (!product) return null;

  return {
    product,
    context,
    summary: {
      averageRating: Number(product.rating || 0),
      totalReviews: Number(product.reviews || 0),
    },
  };
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId, productType } = req.query;
    const context = resolveProductContext(productType);

    if (!mongoose.isValidObjectId(productId) || !context) {
      return res.status(400).json({
        success: false,
        message: "Valid product id and product type are required",
      });
    }

    const productData = await loadProductSummary({ productId, productType });
    if (!productData?.product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviews = await ProductReview.find({
      productId,
      productType: context.productType,
    })
      .populate("userId", "name photoUrl")
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      product: {
        _id: productData.product._id,
        name: productData.product.name,
      },
      summary: productData.summary,
      reviews: reviews.map(serializeReview),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load product reviews",
    });
  }
};

export const getProductReviewMeta = async (req, res) => {
  try {
    const { productId, productType } = req.query;
    const context = resolveProductContext(productType);

    if (!mongoose.isValidObjectId(productId) || !context) {
      return res.status(400).json({
        success: false,
        message: "Valid product id and product type are required",
      });
    }

    const [deliveredOrder, userReview] = await Promise.all([
      getDeliveredPurchase({
        userId: req.id,
        productId,
        productType: context.productType,
      }),
      ProductReview.findOne({
        userId: req.id,
        productId,
        productType: context.productType,
      })
        .populate("userId", "name photoUrl")
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      hasDeliveredPurchase: Boolean(deliveredOrder),
      canReview: Boolean(deliveredOrder),
      deliveredOrderId: deliveredOrder?._id || null,
      userReview: userReview ? serializeReview(userReview) : null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load review eligibility",
    });
  }
};

export const upsertProductReview = async (req, res) => {
  try {
    const { productId, productType, rating, title, comment } = req.body || {};
    const validationError = validateReviewInput({
      productId,
      productType,
      rating,
      comment,
    });

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const context = resolveProductContext(productType);
    const product = await context.model.findById(productId).select("_id name").lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const deliveredOrder = await getDeliveredPurchase({
      userId: req.id,
      productId,
      productType: context.productType,
    });

    if (!deliveredOrder) {
      return res.status(403).json({
        success: false,
        message: "Only delivered purchases can be reviewed",
      });
    }

    const existingReview = await ProductReview.findOne({
      userId: req.id,
      productId,
      productType: context.productType,
    });

    let review;
    if (existingReview) {
      existingReview.rating = Number(rating);
      existingReview.title = String(title || "").trim();
      existingReview.comment = String(comment || "").trim();
      existingReview.orderId = existingReview.orderId || deliveredOrder._id;
      review = await existingReview.save();
    } else {
      review = await ProductReview.create({
        userId: req.id,
        productId,
        productType: context.productType,
        orderId: deliveredOrder._id,
        rating: Number(rating),
        title: String(title || "").trim(),
        comment: String(comment || "").trim(),
        isVerifiedPurchase: true,
      });
    }

    await syncProductReviewStats({
      productId,
      productType: context.productType,
    });

    const populatedReview = await ProductReview.findById(review._id)
      .populate("userId", "name photoUrl")
      .lean();

    return res.status(existingReview ? 200 : 201).json({
      success: true,
      message: existingReview
        ? "Review updated successfully"
        : "Review submitted successfully",
      review: serializeReview(populatedReview),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save review",
    });
  }
};

export const deleteProductReview = async (req, res) => {
  try {
    const { productId, productType } = req.query;
    const context = resolveProductContext(productType);

    if (!mongoose.isValidObjectId(productId) || !context) {
      return res.status(400).json({
        success: false,
        message: "Valid product id and product type are required",
      });
    }

    const deletedReview = await ProductReview.findOneAndDelete({
      userId: req.id,
      productId,
      productType: context.productType,
    });

    if (!deletedReview) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    await syncProductReviewStats({
      productId,
      productType: context.productType,
    });

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
    });
  }
};
