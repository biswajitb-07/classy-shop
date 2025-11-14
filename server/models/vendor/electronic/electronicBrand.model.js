import mongoose from "mongoose";

const electronicBrandSchema = new mongoose.Schema(
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

const electronicBrand = mongoose.model(
  "ElectronicBrand",
  electronicBrandSchema
);

export default electronicBrand;
