import mongoose from "mongoose";

const deliveryPayoutSchema = new mongoose.Schema(
  {
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryPartner",
      required: true,
      index: true,
    },
    orderIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    completedOrdersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payoutAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["approved", "paid", "rejected"],
      default: "approved",
    },
    processedNotes: {
      type: String,
      default: "",
      trim: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "delivery_payouts",
  }
);

export const DeliveryPayout = mongoose.model("DeliveryPayout", deliveryPayoutSchema);
