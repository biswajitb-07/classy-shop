import express from "express";
import {
  addToCart,
  updateCartQuantity,
  removeFromCart,
  getCart,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../../controllers/user/cartWishlist.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";

const cartWishlistRouter = express.Router();

cartWishlistRouter.post("/cart/add", isAuthenticatedUser, addToCart);
cartWishlistRouter.put("/cart/update", isAuthenticatedUser, updateCartQuantity);
cartWishlistRouter.delete("/cart/remove", isAuthenticatedUser, removeFromCart);
cartWishlistRouter.get("/cart", isAuthenticatedUser, getCart);

cartWishlistRouter.post("/wishlist/add", isAuthenticatedUser, addToWishlist);
cartWishlistRouter.delete("/wishlist/remove", isAuthenticatedUser, removeFromWishlist);
cartWishlistRouter.get("/wishlist", isAuthenticatedUser, getWishlist);

export default cartWishlistRouter;