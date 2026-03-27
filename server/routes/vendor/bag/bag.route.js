import express from "express";
import {
  getBagItems,
  addBagItem,
  updateBagItem,
  deleteBagItem,
  updateBagImagesByIndex,
  getBagItemsForUser,
} from "../../../controllers/vendor/bag/bag.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const bagRouter = express.Router();

bagRouter.get("/all-bag-items", getBagItemsForUser);
bagRouter.get("/bag-items", isAuthenticatedVendor, getBagItems);
bagRouter.post(
  "/bag-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addBagItem
);
bagRouter.put(
  "/bag-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateBagItem
);

bagRouter.put(
  "/bag-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateBagImagesByIndex
);

bagRouter.delete("/bag-items/:id", isAuthenticatedVendor, deleteBagItem);

export default bagRouter;
