import express from "express";
import { getPublicSiteContent } from "../../controllers/siteContent.controller.js";

const siteContentUserRouter = express.Router();

siteContentUserRouter.get("/", getPublicSiteContent);

export default siteContentUserRouter;
