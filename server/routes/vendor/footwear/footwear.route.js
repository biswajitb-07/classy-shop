import express from "express";
import {
  getFootwearItems,
  addFootwearItem,
  updateFootwearItem,
  deleteFootwearItem,
  updateFootwearImagesByIndex,
  getFootwearItemsForUser,
} from "../../../controllers/vendor/footwear/footwear.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const footwearRouter = express.Router();

footwearRouter.get("/all-footwear-items", getFootwearItemsForUser);
footwearRouter.get("/footwear-items", isAuthenticatedVendor, getFootwearItems);
footwearRouter.post(
  "/footwear-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addFootwearItem
);
footwearRouter.put(
  "/footwear-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateFootwearItem
);

footwearRouter.put(
  "/footwear-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateFootwearImagesByIndex
);

footwearRouter.delete(
  "/footwear-items/:id",
  isAuthenticatedVendor,
  deleteFootwearItem
);

export default footwearRouter;
