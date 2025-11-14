import mongoose from "mongoose";

const footwearBrandSchema = new mongoose.Schema(
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

const footwearBrand = mongoose.model(
  "FootwearBrand",
  footwearBrandSchema
);

export default footwearBrand;
