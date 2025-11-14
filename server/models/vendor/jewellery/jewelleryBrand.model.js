import mongoose from "mongoose";

const jewelleryBrandSchema = new mongoose.Schema(
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

const jewelleryBrand = mongoose.model(
  "JewelleryBrand",
  jewelleryBrandSchema
);

export default jewelleryBrand;
