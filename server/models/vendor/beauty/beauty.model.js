import mongoose from "mongoose";

const beautySchema = new mongoose.Schema(
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
      default: "",
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
    baseRating: {
      type: Number,
      default: null,
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

const Beauty = mongoose.model("Beauty", beautySchema);

export default Beauty;
