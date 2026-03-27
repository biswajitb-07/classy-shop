// File guide: user.model source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import mongoose from "mongoose";

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
        village: String,
        city: String,
        district: String,
        state: String,
        postalCode: String,
        country: { type: String, default: "India" },
        isDefault: { type: Boolean, default: false },
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
