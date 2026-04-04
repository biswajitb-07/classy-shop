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
import {
  getAiCatalogChatReply,
  getAiMemoryRecommendationDialog,
  getAiPoweredSearchResults,
  streamAiCatalogChatReply,
  trackAiBehavior,
} from "../../controllers/ai/ai.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import optionalAuthenticatedUser from "../../middleware/user/optionalAuthenticatedUser.js";

const cartWishlistRouter = express.Router();

cartWishlistRouter.post("/cart/add", isAuthenticatedUser, addToCart);
cartWishlistRouter.put("/cart/update", isAuthenticatedUser, updateCartQuantity);
cartWishlistRouter.delete("/cart/remove", isAuthenticatedUser, removeFromCart);
cartWishlistRouter.get("/cart", isAuthenticatedUser, getCart);

cartWishlistRouter.post("/wishlist/add", isAuthenticatedUser, addToWishlist);
cartWishlistRouter.delete("/wishlist/remove", isAuthenticatedUser, removeFromWishlist);
cartWishlistRouter.get("/wishlist", isAuthenticatedUser, getWishlist);
cartWishlistRouter.post("/ai-chat", optionalAuthenticatedUser, getAiCatalogChatReply);
cartWishlistRouter.post("/ai-chat/stream", optionalAuthenticatedUser, streamAiCatalogChatReply);
cartWishlistRouter.post("/ai-chat/behavior", optionalAuthenticatedUser, trackAiBehavior);
cartWishlistRouter.get("/ai-chat/recommendations", optionalAuthenticatedUser, getAiMemoryRecommendationDialog);
cartWishlistRouter.post("/ai-chat/search", optionalAuthenticatedUser, getAiPoweredSearchResults);

export default cartWishlistRouter;
