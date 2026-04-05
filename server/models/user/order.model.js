import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },
      productType: {
        type: String,
        required: true,
      },
      productName: {
        type: String,
        default: "",
      },
      variant: {
        type: String,
        default: "",
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  subtotalAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  coupon: {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    code: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      default: "",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
  },
  walletApplied: {
    amountUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isRefunded: {
      type: Boolean,
      default: false,
    },
    appliedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
  },
  assignedDeliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryPartner",
    default: null,
  },
  assignedDeliveryAt: {
    type: Date,
    default: null,
  },
  deliveryConfirmation: {
    purpose: {
      type: String,
      enum: ["", "delivery", "return"],
      default: "",
    },
    otpHash: {
      type: String,
      default: "",
    },
    otpExpireAt: {
      type: Number,
      default: 0,
    },
    otpSentAt: {
      type: Date,
      default: null,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  shippingAddress: {
    fullName: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
    },
    village: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
      label: {
        type: String,
        default: "",
      },
      source: {
        type: String,
        default: "",
      },
      geocodedAt: {
        type: Date,
        default: null,
      },
    },
  },
  returnRequest: {
    reason: {
      type: String,
      default: "",
      trim: true,
    },
    requestedAt: {
      type: Date,
      default: null,
    },
    windowEndsAt: {
      type: Date,
      default: null,
    },
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["razorpay", "cod", "wallet"],
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ["pending", "completed", "failed", "refund"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    required: true,
    enum: [
      "pending",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
      "return_requested",
      "return_approved",
      "return_rejected",
      "return_completed",
    ],
    default: "pending",
  },
  orderId: {
    type: String,
    unique: true,
    required: true,
  },
  razorpayOrderId: {
    type: String,
    default: "",
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    default: "",
    index: true,
  },
  razorpayRefundId: {
    type: String,
    default: "",
  },
  statusHistory: [
    {
      from: { type: String },
      to: { type: String },
      by: { type: mongoose.Schema.Types.ObjectId },
      role: { type: String },
      reason: { type: String, default: "" },
      at: { type: Date, default: Date.now },
    },
  ],
  refundRequestedAt: { type: Date },
  refundCompletedAt: { type: Date },
  stockAdjusted: {
    type: Boolean,
    default: false,
  },
  stockRestored: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

orderSchema.index(
  { razorpayOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayOrderId: { $type: "string", $ne: "" },
    },
  },
);

orderSchema.index(
  { razorpayPaymentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayPaymentId: { $type: "string", $ne: "" },
    },
  },
);

export default mongoose.model("Order", orderSchema);
