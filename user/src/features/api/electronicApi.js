// File guide: electronicApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ELECTRONIC_API = `${BASE_URL}/api/v1/vendor/electronic/`;

export const electronicApi = createApi({
  reducerPath: "electronicApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ELECTRONIC_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getElectronicItems: builder.query({
      query: () => `all-electronic-items`,
    }),
  }),
});

export const { useGetElectronicItemsQuery } = electronicApi;
