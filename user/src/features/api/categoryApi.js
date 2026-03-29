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
      keepUnusedDataFor: 1800,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }),
  }),
});

export const { useGetVendorCategoriesQuery } = categoryApi;
