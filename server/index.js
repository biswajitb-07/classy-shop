import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import connectDB from "./db/db.js";
import userRouter from "./routes/user/user.route.js";
import session from "express-session";
import passport from "passport";
import "./utils/passport.js";
import vendorRouter from "./routes/vendor/vendor.route.js";
import categoryRouter from "./routes/vendor/category.route.js";
import fashionBrandRouter from "./routes/vendor/fashion/fashionBrand.route.js";
import fashionRouter from "./routes/vendor/fashion/fashion.route.js";
import cartWishlistRouter from "./routes/user/cartWishlist.route.js";
import electronicBrandRouter from "./routes/vendor/electronic/electronicBrand.route.js";
import electronicRouter from "./routes/vendor/electronic/electronic.route.js";
import orderRouter from "./routes/user/order.route.js";
import bagBrandRouter from "./routes/vendor/bag/bagBrand.route.js";
import groceryBrandRouter from "./routes/vendor/grocery/groceryBrand.route.js";
import footwearBrandRouter from "./routes/vendor/footwear/footwearBrand.route.js";
import beautyBrandRouter from "./routes/vendor/beauty/beautyBrand.route.js";
import wellnessBrandRouter from "./routes/vendor/wellness/wellness.route.js";
import jewelleryBrandRouter from "./routes/vendor/jewellery/jewelleryBrand.route.js";
import bagBrand from "./models/vendor/bag/bagBrand.model.js";

const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());

const allowedOrigins = [process.env.USER_URL, process.env.VENDOR_URL];

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use("/api/v1/user", userRouter);

app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/vendor/category", categoryRouter);

app.use("/api/v1/vendor/brands", fashionBrandRouter);
app.use("/api/v1/vendor/fashion", fashionRouter);

app.use("/api/v1/vendor/electronic-brands", electronicBrandRouter);
app.use("/api/v1/vendor/electronic", electronicRouter);

app.use("/api/v1/vendor/bag-brands", bagBrandRouter);
app.use("/api/v1/vendor/bag", bagBrand);

app.use("/api/v1/vendor/grocery-brands", groceryBrandRouter);
app.use("/api/v1/vendor/footwear-brands", footwearBrandRouter);
app.use("/api/v1/vendor/beauty-brands", beautyBrandRouter);
app.use("/api/v1/vendor/wellness-brands", wellnessBrandRouter);
app.use("/api/v1/vendor/jewellery-brands", jewelleryBrandRouter);

app.use("/api/v1/product", cartWishlistRouter);
app.use("/api/v1/vendor/orders", orderRouter);
app.use("/api/v1/product/order", orderRouter);

app.listen(port, () => {
  console.log(`Server running on PORT:${port}`);
});
