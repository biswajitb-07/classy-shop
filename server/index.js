import express from "express";
import { createServer } from "node:http";
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
import bagRouter from "./routes/vendor/bag/bag.route.js";
import groceryBrandRouter from "./routes/vendor/grocery/groceryBrand.route.js";
import groceryRouter from "./routes/vendor/grocery/grocery.route.js";
import footwearBrandRouter from "./routes/vendor/footwear/footwearBrand.route.js";
import footwearRouter from "./routes/vendor/footwear/footwear.route.js";
import beautyBrandRouter from "./routes/vendor/beauty/beautyBrand.route.js";
import beautyRouter from "./routes/vendor/beauty/beauty.route.js";
import wellnessBrandRouter from "./routes/vendor/wellness/wellnessBrand.route.js";
import wellnessRouter from "./routes/vendor/wellness/wellness.route.js";
import jewelleryBrandRouter from "./routes/vendor/jewellery/jewelleryBrand.route.js";
import jewelleryRouter from "./routes/vendor/jewellery/jewellery.route.js";
import deliveryRouter from "./routes/delivery/delivery.route.js";
import { ensureDefaultAdminAccount } from "./controllers/admin/admin.controller.js";
import { initSocket } from "./socket/socket.js";
import { verifyEmailTransport } from "./utils/emailService.js";
import {
  applyBasicSecurityHeaders,
  getAllowedOrigins,
  requireTrustedOrigin,
} from "./utils/security.js";

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Connect once during boot so all route handlers and socket events can share
// the same Mongo connection pool.
connectDB();
ensureDefaultAdminAccount().catch((error) => {
  console.error("Failed to ensure default admin account:", error);
});

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(applyBasicSecurityHeaders);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());


const allowedOrigins = getAllowedOrigins({ isProduction });

app.use(
  cors({
    origin(origin, callback) {
  
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(requireTrustedOrigin(allowedOrigins));

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ ok: true, uptime: process.uptime() });
});

app.use("/api/v1/user", userRouter);

app.use("/api/v1/vendor", vendorRouter);
app.use("/api/v1/vendor/category", categoryRouter);

app.use("/api/v1/vendor/brands", fashionBrandRouter);
app.use("/api/v1/vendor/fashion", fashionRouter);

app.use("/api/v1/vendor/electronic-brands", electronicBrandRouter);
app.use("/api/v1/vendor/electronic", electronicRouter);

app.use("/api/v1/vendor/bag-brands", bagBrandRouter);
app.use("/api/v1/vendor/bag", bagRouter);

app.use("/api/v1/vendor/grocery-brands", groceryBrandRouter);
app.use("/api/v1/vendor/grocery", groceryRouter);
app.use("/api/v1/vendor/footwear-brands", footwearBrandRouter);
app.use("/api/v1/vendor/footwear", footwearRouter);
app.use("/api/v1/vendor/beauty-brands", beautyBrandRouter);
app.use("/api/v1/vendor/beauty", beautyRouter);
app.use("/api/v1/vendor/wellness-brands", wellnessBrandRouter);
app.use("/api/v1/vendor/wellness", wellnessRouter);
app.use("/api/v1/vendor/jewellery-brands", jewelleryBrandRouter);
app.use("/api/v1/vendor/jewellery", jewelleryRouter);

app.use("/api/v1/product", cartWishlistRouter);
app.use("/api/v1/vendor/orders", orderRouter);
app.use("/api/v1/product/order", orderRouter);
app.use("/api/v1/delivery", deliveryRouter);

// Socket.IO shares the same HTTP server so realtime support chat and presence
// updates live alongside the normal REST API.
initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Server running on PORT:${port}`);
  verifyEmailTransport();
});
