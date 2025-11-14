import mongoose from "mongoose";

const beautyBrandSchema = new mongoose.Schema(
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

const beautyBrand = mongoose.model(
  "BeautyBrand",
  beautyBrandSchema
);

export default beautyBrand;
