import mongoose from "mongoose";

const wellnessBrandSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      unique: true,
    },
    brand: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
  },
  { timestamps: true }
);

const wellnessBrand = mongoose.model(
  "WellnessBrand",
  wellnessBrandSchema
);

export default wellnessBrand;
