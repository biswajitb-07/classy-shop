import express from "express";
import {
  getWellnessItems,
  addWellnessItem,
  updateWellnessItem,
  deleteWellnessItem,
  updateWellnessImagesByIndex,
  getWellnessItemsForUser,
} from "../../../controllers/vendor/wellness/wellness.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const wellnessRouter = express.Router();

wellnessRouter.get("/all-wellness-items", getWellnessItemsForUser);
wellnessRouter.get(
  "/wellness-items",
  isAuthenticatedVendor,
  getWellnessItems
);
wellnessRouter.post(
  "/wellness-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addWellnessItem
);
wellnessRouter.put(
  "/wellness-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateWellnessItem
);

wellnessRouter.put(
  "/wellness-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateWellnessImagesByIndex
);

wellnessRouter.delete(
  "/wellness-items/:id",
  isAuthenticatedVendor,
  deleteWellnessItem
);

export default wellnessRouter;
