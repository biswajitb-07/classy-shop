import { configureStore } from "@reduxjs/toolkit";
import rootRedcuer from "./rootReducer";
import { authApi } from "../features/api/authApi.js";
import { fashionApi } from "../features/api/fashionApi.js";
import { cartApi } from "../features/api/cartApi.js";
import { categoryApi } from "../features/api/categoryApi.js";
import { electronicApi } from "../features/api/electronicApi.js";
import { orderApi } from "../features/api/orderApi.js";

export const appStore = configureStore({
  reducer: rootRedcuer,
  middleware: (defaultMiddleware) =>
    defaultMiddleware().concat(
      authApi.middleware,
      fashionApi.middleware,
      cartApi.middleware,
      categoryApi.middleware,
      electronicApi.middleware,
      orderApi.middleware
    ),
});

const initializeApp = async () => {
  await appStore.dispatch(
    authApi.endpoints.loadUser.initiate({}, { forceRefetch: true })
  );
};
initializeApp();
