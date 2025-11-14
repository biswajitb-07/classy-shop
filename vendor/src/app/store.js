import { configureStore } from "@reduxjs/toolkit";
import rootRedcuer from "./rootReducer";
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

export const appStore = configureStore({
  reducer: rootRedcuer,
  middleware: (defaultMiddleware) =>
    defaultMiddleware().concat(
      authApi.middleware,
      categoryApi.middleware,
      fashionBrandApi.middleware,
      fashionApi.middleware,
      electronicBrandApi.middleware,
      electronicApi.middleware,
      bagBrandApi.middleware,
      bagApi.middleware,
      groceryBrandApi.middleware,
      footwearBrandApi.middleware,
      beautyBrandApi.middleware,
      wellnessBrandApi.middleware,
      jewelleryBrandApi.middleware,
      orderApi.middleware
    ),
});

const initializeApp = async () => {
  await appStore.dispatch(
    authApi.endpoints.loadUser.initiate({}, { forceRefetch: true })
  );
};
initializeApp();
