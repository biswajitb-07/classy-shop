import { combineReducers } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";

import { authApi } from "../features/api/authApi";
import { fashionApi } from "../features/api/fashionApi";
import { cartApi } from "../features/api/cartApi";
import { categoryApi } from "../features/api/categoryApi";
import { electronicApi } from "../features/api/electronicApi";
import { orderApi } from "../features/api/orderApi";

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
