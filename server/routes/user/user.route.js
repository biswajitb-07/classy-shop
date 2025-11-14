import express from "express";
import passport from "passport";
import {
  login,
  logout,
  register,
  getUserProfile,
  updateUserProfile,
  sendResetOtp,
  resetPassword,
  changePassword,
} from "../../controllers/user/user.controller.js";
import isAuthenticatedUser from "../../middleware/user/isAuthenticatedUser.js";
import upload from "../../utils/multer.js";
import {
  googleAuth,
  googlePassword,
} from "../../controllers/googleAuth/google.controller.js";

const userRouter = express.Router();

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
userRouter.get("/logout", logout);
userRouter.post("/send-reset-otp", sendResetOtp);
userRouter.post("/reset-password", resetPassword);
userRouter.post("/change-password", isAuthenticatedUser, changePassword);

userRouter.get("/profile", isAuthenticatedUser, getUserProfile);
userRouter.put(
  "/profile/update",
  isAuthenticatedUser,
  upload.single("photo"),
  updateUserProfile
);

export default userRouter;
