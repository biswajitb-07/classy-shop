// File guide: beautyApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BEAUTY_API = `${BASE_URL}/api/v1/vendor/beauty/`;

export const beautyApi = createApi({
  reducerPath: "beautyApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BEAUTY_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getBeautyItems: builder.query({
      query: () => "all-beauty-items",
    }),
  }),
});

export const { useGetBeautyItemsQuery } = beautyApi;
