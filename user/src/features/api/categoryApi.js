// File guide: categoryApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const CATEGORY_API = `${BASE_URL}/api/v1/vendor/category/`;

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CATEGORY_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getVendorCategories: builder.query({
      query: () => ({
        url: "",
        method: "GET",
      }),
    }),
  }),
});

export const { useGetVendorCategoriesQuery } = categoryApi;
