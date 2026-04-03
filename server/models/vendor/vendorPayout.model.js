import mongoose from "mongoose";

const vendorPayoutSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    availableBalanceAtRequest: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 400,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processedNotes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 400,
    },
  },
  {
    timestamps: true,
    collection: "vendor_payouts",
  },
);

export const VendorPayout = mongoose.model("VendorPayout", vendorPayoutSchema);
