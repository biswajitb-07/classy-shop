import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FASHION_API = `${BASE_URL}/api/v1/vendor/fashion/`;

export const fashionApi = createApi({
  reducerPath: "fashionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FASHION_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getFashionItems: builder.query({
      query: () => `all-fashion-items`,
    }),
  }),
});

export const { useGetFashionItemsQuery } = fashionApi;
