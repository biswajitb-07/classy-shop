import express from "express";
import {
  getElectronicItems,
  addElectronicItem,
  updateElectronicItem,
  deleteElectronicItem,
  updateElectronicImagesByIndex,
  getElectronicItemsForUser,
} from "../../../controllers/vendor/electronic/electronic.controller.js";
import isAuthenticatedVendor from "../../../middleware/vendor/isAuthenticatedVendor.js";
import upload from "../../../utils/multer.js";

const electronicRouter = express.Router();

electronicRouter.get("/all-electronic-items", getElectronicItemsForUser);
electronicRouter.get(
  "/electronic-items",
  isAuthenticatedVendor,
  getElectronicItems
);
electronicRouter.post(
  "/electronic-items",
  isAuthenticatedVendor,
  upload.array("image", 5),
  addElectronicItem
);
electronicRouter.put(
  "/electronic-items/:id",
  isAuthenticatedVendor,
  upload.array("image"),
  updateElectronicItem
);

electronicRouter.put(
  "/electronic-items/update-multiple-images/:id",
  isAuthenticatedVendor,
  upload.fields([
    { name: "replaceFiles", maxCount: 10 },
    { name: "newFiles", maxCount: 10 },
  ]),
  updateElectronicImagesByIndex
);

electronicRouter.delete(
  "/electronic-items/:id",
  isAuthenticatedVendor,
  deleteElectronicItem
);

export default electronicRouter;
