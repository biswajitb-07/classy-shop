import mongoose from "mongoose";

const variantQuantitySchema = new mongoose.Schema(
  {
    variant: { type: String, required: true },
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productType: { type: String, required: true },
    variants: [variantQuantitySchema],
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);

export const Cart = mongoose.model("Cart", cartSchema);
