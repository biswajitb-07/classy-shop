// File guide: grocery.route source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import express from "express";
import {
  getGroceryItems,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  updateGroceryImagesByIndex,
  getGroceryItemsForUser,
} from "../../../controllers/vendor/grocery/grocery.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const groceryRouter = express.Router();

groceryRouter.get("/all-grocery-items", getGroceryItemsForUser);
groceryRouter.get("/grocery-items", isAuthenticatedVendor, getGroceryItems);
groceryRouter.post(
  "/grocery-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addGroceryItem
);
groceryRouter.put(
  "/grocery-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateGroceryItem
);

groceryRouter.put(
  "/grocery-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateGroceryImagesByIndex
);

groceryRouter.delete(
  "/grocery-items/:id",
  isAuthenticatedVendor,
  deleteGroceryItem
);

export default groceryRouter;
