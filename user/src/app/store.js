import { configureStore } from "@reduxjs/toolkit";
import rootRedcuer from "./rootReducer";
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

export const appStore = configureStore({
  reducer: rootRedcuer,
  middleware: (defaultMiddleware) =>
    defaultMiddleware().concat(
      authApi.middleware,
      bagApi.middleware,
      fashionApi.middleware,
      footwearApi.middleware,
      groceryApi.middleware,
      beautyApi.middleware,
      wellnessApi.middleware,
      jewelleryApi.middleware,
      cartApi.middleware,
      categoryApi.middleware,
      electronicApi.middleware,
      orderApi.middleware,
      supportApi.middleware,
      contentApi.middleware,
      newsletterApi.middleware,
      reviewApi.middleware,
      aiApi.middleware
    ),
});

const initializeApp = async () => {
  await appStore.dispatch(
    authApi.endpoints.loadUser.initiate({}, { forceRefetch: true })
  );
};
initializeApp();
