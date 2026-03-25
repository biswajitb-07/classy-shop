import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const JEWELLERY_API = `${BASE_URL}/api/v1/vendor/jewellery/`;

export const jewelleryApi = createApi({
  reducerPath: "jewelleryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: JEWELLERY_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getJewelleryItems: builder.query({
      query: () => "all-jewellery-items",
    }),
  }),
});

export const { useGetJewelleryItemsQuery } = jewelleryApi;
