import mongoose from "mongoose";

const fashionSchema = new mongoose.Schema(
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
      enum: ["S", "M", "L", "XL", "XXL"],
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

const Fashion = mongoose.model("Fashion", fashionSchema);

export default Fashion;
