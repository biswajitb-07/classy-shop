// File guide: jewellery.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  getJewelleryItems,
  addJewelleryItem,
  updateJewelleryItem,
  deleteJewelleryItem,
  updateJewelleryImagesByIndex,
  getJewelleryItemsForUser,
} from "../../../controllers/vendor/jewellery/jewellery.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const jewelleryRouter = express.Router();

jewelleryRouter.get("/all-jewellery-items", getJewelleryItemsForUser);
jewelleryRouter.get("/jewellery-items", isAuthenticatedVendor, getJewelleryItems);
jewelleryRouter.post(
  "/jewellery-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addJewelleryItem
);
jewelleryRouter.put(
  "/jewellery-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateJewelleryItem
);

jewelleryRouter.put(
  "/jewellery-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateJewelleryImagesByIndex
);

jewelleryRouter.delete(
  "/jewellery-items/:id",
  isAuthenticatedVendor,
  deleteJewelleryItem
);

export default jewelleryRouter;
