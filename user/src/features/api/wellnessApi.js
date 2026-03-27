// File guide: wellnessApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
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
