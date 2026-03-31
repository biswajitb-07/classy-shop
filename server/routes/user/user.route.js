import express from "express";
import passport from "passport";
import {
  login,
  logout,
  register,
  getUserProfile,
  updateUserProfile,
  updateUserAddresses,
  sendResetOtp,
  resetPassword,
  changePassword,
  getUserSocketAuth,
  firebaseGoogleLogin,
} from "../../controllers/user/user.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import upload from "../../utils/multer.js";
import {
  googleAuth,
  googlePassword,
} from "../../controllers/googleAuth/google.controller.js";
import { subscribeNewsletter } from "../../controllers/newsletter.controller.js";
import {
  createUserSupportConversation,
  cleanupUserEmptySupportConversations,
  deleteUserSupportConversation,
  getUserSupportConversationDetails,
  getUserSupportConversations,
  getUserSupportConversation,
  sendUserSupportMessage,
} from "../../controllers/support/support.controller.js";
import {
  deleteProductReview,
  getProductReviewMeta,
  getProductReviews,
  upsertProductReview,
} from "../../controllers/user/review.controller.js";
import siteContentUserRouter from "./siteContent.route.js";

const userRouter = express.Router();

// Legacy Passport Google auth is still kept, while Firebase Google login uses
// a separate token-based endpoint below.
userRouter.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
userRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false }),
  googleAuth
);

userRouter.post("/set-password", isAuthenticatedUser, googlePassword);
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.post("/firebase-google-login", firebaseGoogleLogin);
userRouter.get("/logout", logout);
userRouter.post("/send-reset-otp", sendResetOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/change-password", isAuthenticatedUser, changePassword);
userRouter.post("/newsletter/subscribe", subscribeNewsletter);
userRouter.get("/socket-auth", isAuthenticatedUser, getUserSocketAuth);
userRouter.get("/reviews", getProductReviews);
userRouter.get("/reviews/meta", isAuthenticatedUser, getProductReviewMeta);
userRouter.post("/reviews", isAuthenticatedUser, upsertProductReview);
userRouter.delete("/reviews", isAuthenticatedUser, deleteProductReview);

userRouter.get("/profile", isAuthenticatedUser, getUserProfile);
userRouter.put(
  "/profile/update",
  isAuthenticatedUser,
  upload.single("photo"),
  updateUserProfile
);
userRouter.put("/profile/addresses", isAuthenticatedUser, updateUserAddresses);
userRouter.get("/support/conversation", isAuthenticatedUser, getUserSupportConversation);
userRouter.get("/support/conversations", isAuthenticatedUser, getUserSupportConversations);
userRouter.post("/support/conversations", isAuthenticatedUser, createUserSupportConversation);
// Empty draft chats are cleaned separately so a user can open a new support
// thread UI without permanently storing it until they send a message.
userRouter.delete(
  "/support/conversations/empty",
  isAuthenticatedUser,
  cleanupUserEmptySupportConversations
);
userRouter.get(
  "/support/conversations/:conversationId",
  isAuthenticatedUser,
  getUserSupportConversationDetails
);
userRouter.post(
  "/support/message",
  isAuthenticatedUser,
  upload.array("attachments", 4),
  sendUserSupportMessage
);
userRouter.delete(
  "/support/conversations/:conversationId",
  isAuthenticatedUser,
  deleteUserSupportConversation
);
userRouter.use("/site-content", siteContentUserRouter);

export default userRouter;
