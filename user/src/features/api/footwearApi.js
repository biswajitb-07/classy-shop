// File guide: footwearApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FOOTWEAR_API = `${BASE_URL}/api/v1/vendor/footwear/`;

export const footwearApi = createApi({
  reducerPath: "footwearApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FOOTWEAR_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getFootwearItems: builder.query({
      query: () => `all-footwear-items`,
    }),
  }),
});

export const { useGetFootwearItemsQuery } = footwearApi;
