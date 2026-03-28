import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const CONTENT_API = `${BASE_URL}/api/v1/user/site-content`;

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CONTENT_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getSiteContent: builder.query({
      query: () => ({
        url: "/",
        method: "GET",
      }),
      keepUnusedDataFor: 3600,
      refetchOnMountOrArgChange: false,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),
  }),
});

export const { useGetSiteContentQuery } = contentApi;
