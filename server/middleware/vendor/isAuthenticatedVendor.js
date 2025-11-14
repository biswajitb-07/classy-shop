import jwt from "jsonwebtoken";

const isAuthenticatedVendor = async (req, res, next) => {
  try {
    const token = req.cookies.token1;
    if (!token) {
      return res.status(401).json({
        message: "Vendor not authenticated",
        success: false,
      });
    }
    const decode = await jwt.verify(token, process.env.SECRET_KEY);
    if (!decode) {
      return res.status(401).json({
        message: "Invalid token",
        success: false,
      });
    }
    req.id = decode.vendorId;
    req.role = "vendor";
    next();
  } catch (error) {
    console.log(error);
  }
};
export default isAuthenticatedVendor;
