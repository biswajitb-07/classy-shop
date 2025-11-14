import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
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
      enum: ["vendor"],
      default: "vendor",
    },
    addresses: [
      {
        type: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        street: String,
        city: String,
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

export const Vendor = mongoose.model("Vendor", vendorSchema);
