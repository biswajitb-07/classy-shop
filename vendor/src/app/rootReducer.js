import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";

import { authApi } from "../features/api/authApi";
import { categoryApi } from "../features/api/categoryApi";
import { fashionBrandApi } from "../features/api/fashion/fashionBrandApi";
import { fashionApi } from "../features/api/fashion/fashionApi";
import { electronicBrandApi } from "../features/api/electronic/electronicBrandApi";
import { electronicApi } from "../features/api/electronic/electronicApi";
import { bagBrandApi } from "../features/api/bag/bagBrandApi";
import { groceryBrandApi } from "../features/api/grocery/groceryBrandApi";
import { footwearBrandApi } from "../features/api/footwear/footwearBrandApi";
import { beautyBrandApi } from "../features/api/beauty/beautyBrandApi";
import { wellnessBrandApi } from "../features/api/wellness/welllnessBrandApi";
import { jewelleryBrandApi } from "../features/api/jewellery/jewelleryBrandApi";
import { bagApi } from "../features/api/bag/bagApi";
import { orderApi } from "../features/api/orderApi";

const rootRedcuer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [categoryApi.reducerPath]: categoryApi.reducer,
  [fashionBrandApi.reducerPath]: fashionBrandApi.reducer,
  [fashionApi.reducerPath]: fashionApi.reducer,
  [electronicBrandApi.reducerPath]: electronicBrandApi.reducer,
  [electronicApi.reducerPath]: electronicApi.reducer,
  [bagBrandApi.reducerPath]: bagBrandApi.reducer,
  [bagApi.reducerPath]: bagApi.reducer,
  [groceryBrandApi.reducerPath]: groceryBrandApi.reducer,
  [footwearBrandApi.reducerPath]: footwearBrandApi.reducer,
  [beautyBrandApi.reducerPath]: beautyBrandApi.reducer,
  [wellnessBrandApi.reducerPath]: wellnessBrandApi.reducer,
  [jewelleryBrandApi.reducerPath]: jewelleryBrandApi.reducer,
  [orderApi.reducerPath]: orderApi.reducer,
  auth: authReducer,
});
export default rootRedcuer;
