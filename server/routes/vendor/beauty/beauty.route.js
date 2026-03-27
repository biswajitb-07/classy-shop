// File guide: beauty.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  getBeautyItems,
  addBeautyItem,
  updateBeautyItem,
  deleteBeautyItem,
  updateBeautyImagesByIndex,
  getBeautyItemsForUser,
} from "../../../controllers/vendor/beauty/beauty.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const beautyRouter = express.Router();

beautyRouter.get("/all-beauty-items", getBeautyItemsForUser);
beautyRouter.get("/beauty-items", isAuthenticatedVendor, getBeautyItems);
beautyRouter.post(
  "/beauty-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addBeautyItem
);
beautyRouter.put(
  "/beauty-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateBeautyItem
);

beautyRouter.put(
  "/beauty-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateBeautyImagesByIndex
);

beautyRouter.delete(
  "/beauty-items/:id",
  isAuthenticatedVendor,
  deleteBeautyItem
);

export default beautyRouter;
