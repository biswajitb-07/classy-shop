import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";

import { authApi } from "../features/api/authApi.js";
import { bagApi } from "../features/api/bagApi.js";
import { fashionApi } from "../features/api/fashionApi.js";
import { footwearApi } from "../features/api/footwearApi.js";
import { groceryApi } from "../features/api/groceryApi.js";
import { beautyApi } from "../features/api/beautyApi.js";
import { wellnessApi } from "../features/api/wellnessApi.js";
import { jewelleryApi } from "../features/api/jewelleryApi.js";
import { cartApi } from "../features/api/cartApi.js";
import { categoryApi } from "../features/api/categoryApi.js";
import { electronicApi } from "../features/api/electronicApi.js";
import { orderApi } from "../features/api/orderApi.js";
import { supportApi } from "../features/api/supportApi.js";
import { contentApi } from "../features/api/contentApi.js";
import { newsletterApi } from "../features/api/newsletterApi.js";
import { reviewApi } from "../features/api/reviewApi.js";
import { aiApi } from "../features/api/aiApi.js";

const rootRedcuer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [bagApi.reducerPath]: bagApi.reducer,
  [fashionApi.reducerPath]: fashionApi.reducer,
  [footwearApi.reducerPath]: footwearApi.reducer,
  [groceryApi.reducerPath]: groceryApi.reducer,
  [beautyApi.reducerPath]: beautyApi.reducer,
  [wellnessApi.reducerPath]: wellnessApi.reducer,
  [jewelleryApi.reducerPath]: jewelleryApi.reducer,
  [electronicApi.reducerPath]: electronicApi.reducer,
  [cartApi.reducerPath]: cartApi.reducer,
  [categoryApi.reducerPath]: categoryApi.reducer,
  [orderApi.reducerPath]: orderApi.reducer,
  [supportApi.reducerPath]: supportApi.reducer,
  [contentApi.reducerPath]: contentApi.reducer,
  [newsletterApi.reducerPath]: newsletterApi.reducer,
  [reviewApi.reducerPath]: reviewApi.reducer,
  [aiApi.reducerPath]: aiApi.reducer,
  auth: authReducer,
});
export default rootRedcuer;
