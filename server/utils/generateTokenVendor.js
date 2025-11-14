import jwt from "jsonwebtoken";

export const generateTokenVendor = (res, vendor, message) => {
  const token = jwt.sign({ vendorId: vendor._id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });

  return res
    .status(200)
    .cookie("token1", token, {
      httpOnly: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    })
    .json({
      success: true,
      message,
      vendor,
    });
};
