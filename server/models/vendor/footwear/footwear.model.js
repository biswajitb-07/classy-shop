// File guide: footwear.model source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import mongoose from "mongoose";

const footwearSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    image: [
      {
        type: String,
        required: true,
      },
    ],
    rating: {
      type: Number,
      default: 0,
    },
    reviews: {
      type: Number,
      default: 0,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
      required: true,
    },
    inStock: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    sizes: {
      type: [String],
      validate: {
        validator: (sizes) =>
          Array.isArray(sizes) &&
          sizes.every((size) => /^\d+(\.\d+)?$/.test(String(size).trim())),
        message: "Footwear sizes must be numeric values like 7, 8, 9, or 10",
      },
      default: [],
    },
    category: {
      type: String,
      required: true,
      default: "",
    },
    subCategory: {
      type: String,
      default: "",
    },
    thirdLevelCategory: {
      type: String,
      default: "",
    },
    shippingInfo: {
      type: String,
      default: "Free Shipping (Est. Delivery Time 2-3 Days)",
    },
  },
  { timestamps: true }
);

const Footwear = mongoose.model("Footwear", footwearSchema);

export default Footwear;
