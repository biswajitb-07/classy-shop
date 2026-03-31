import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    source: {
      type: String,
      default: "system",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const referralRewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    amount: {
      type: Number,
      default: 0,
    },
    title: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,
      default: null,
    },
    bio: {
      type: String,
      default:
        " your trusted destination for quality and style. Explore thousands of products, discover new favorites, and enjoy seamless shopping. Let’s elevate your shopping experience together!",
    },
    dob: { type: Date, default: "" },
    password: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["user"],
      default: "user",
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        label: {
          type: String,
          default: "",
        },
        fullName: {
          type: String,
          default: "",
        },
        phone: {
          type: String,
          default: "",
        },
        addressLine1: {
          type: String,
          default: "",
        },
        landmark: {
          type: String,
          default: "",
        },
        village: String,
        city: String,
        district: String,
        state: String,
        postalCode: String,
        country: { type: String, default: "India" },
        isDefault: { type: Boolean, default: false },
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
          updatedAt: {
            type: Date,
            default: null,
          },
        },
      },
    ],
    photoUrl: {
      type: String,
      default: "",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      default: "",
    },
    firebaseUid: {
      type: String,
      default: "",
    },
    welcomeMailSent: {
      type: Boolean,
      default: false,
    },
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    wallet: {
      balance: {
        type: Number,
        default: 0,
      },
      lifetimeCredits: {
        type: Number,
        default: 0,
      },
      lifetimeDebits: {
        type: Number,
        default: 0,
      },
      transactions: [walletTransactionSchema],
    },
    referral: {
      code: {
        type: String,
        default: "",
        uppercase: true,
        trim: true,
      },
      referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      successfulReferrals: {
        type: Number,
        default: 0,
      },
      totalEarned: {
        type: Number,
        default: 0,
      },
      rewards: [referralRewardSchema],
    },
    resetOtp: {
      type: String,
      default: "",
    },
    resetOtpExpireAt: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
