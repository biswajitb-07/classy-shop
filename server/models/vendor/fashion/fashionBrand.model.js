import mongoose from "mongoose";

const fashionBrandSchema = new mongoose.Schema(
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

const FashionBrand = mongoose.model("FashionBrand", fashionBrandSchema);

export default FashionBrand;
