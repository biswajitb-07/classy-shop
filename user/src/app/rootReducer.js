import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";

import { authApi } from "../features/api/authApi.js";
import { fashionApi } from "../features/api/fashionApi.js";
import { cartApi } from "../features/api/cartApi.js";
import { categoryApi } from "../features/api/categoryApi.js";
import { electronicApi } from "../features/api/electronicApi.js";
import { orderApi } from "../features/api/orderApi.js";

const rootRedcuer = combineReducers({
  [authApi.reducerPath]: authApi.reducer,
  [fashionApi.reducerPath]: fashionApi.reducer,
  [electronicApi.reducerPath]: electronicApi.reducer,
  [cartApi.reducerPath]: cartApi.reducer,
  [categoryApi.reducerPath]: categoryApi.reducer,
  [orderApi.reducerPath]: orderApi.reducer,
  auth: authReducer,
});
export default rootRedcuer;
