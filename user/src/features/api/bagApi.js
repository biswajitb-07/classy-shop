import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BAG_API = `${BASE_URL}/api/v1/vendor/bag/`;

export const bagApi = createApi({
  reducerPath: "bagApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BAG_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getBagItems: builder.query({
      query: () => "all-bag-items",
    }),
  }),
});

export const { useGetBagItemsQuery } = bagApi;
