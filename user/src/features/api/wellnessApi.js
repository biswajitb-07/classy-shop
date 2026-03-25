import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const WELLNESS_API = `${BASE_URL}/api/v1/vendor/wellness/`;

export const wellnessApi = createApi({
  reducerPath: "wellnessApi",
  baseQuery: fetchBaseQuery({
    baseUrl: WELLNESS_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getWellnessItems: builder.query({
      query: () => "all-wellness-items",
    }),
  }),
});

export const { useGetWellnessItemsQuery } = wellnessApi;
