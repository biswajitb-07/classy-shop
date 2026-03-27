import mongoose from "mongoose";

const electronicSchema = new mongoose.Schema(
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
    rams: {
      type: [String],
      enum: ["4gb", "6gb", "8gb", "12gb", "16gb"],
      default: [],
    },
    storage: {
      type: [String],
      enum: ["32gb", "64gb", "128gb", "256gb", "512gb"],
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

const Electronic = mongoose.model("Electronic", electronicSchema);

export default Electronic;
