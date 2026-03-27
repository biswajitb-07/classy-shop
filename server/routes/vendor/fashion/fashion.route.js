import express from "express";
import {
  getFashionItems,
  addFashionItem,
  updateFashionItem,
  deleteFashionItem,
  updateFashionImagesByIndex,
  getFashionItemsForUser,
} from "../../../controllers/vendor/fashion/fashion.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const fashionRouter = express.Router();

fashionRouter.get("/all-fashion-items", getFashionItemsForUser);
fashionRouter.get("/fashion-items", isAuthenticatedVendor, getFashionItems);
fashionRouter.post(
  "/fashion-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addFashionItem
);
fashionRouter.put(
  "/fashion-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateFashionItem
);

fashionRouter.put(
  "/fashion-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateFashionImagesByIndex
);

fashionRouter.delete(
  "/fashion-items/:id",
  isAuthenticatedVendor,
  deleteFashionItem
);

export default fashionRouter;
