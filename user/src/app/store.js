import { configureStore } from "@reduxjs/toolkit";
import rootRedcuer from "./rootReducer";
import { authApi } from "../features/api/authApi";
import { fashionApi } from "../features/api/fashionApi";
import { cartApi } from "../features/api/cartApi";
import { categoryApi } from "../features/api/categoryApi";
import { electronicApi } from "../features/api/electronicApi";
import { orderApi } from "../features/api/orderApi";

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
