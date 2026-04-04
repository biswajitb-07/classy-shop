import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const aiApi = createApi({
  reducerPath: "aiApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/api/v1/user/`,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getAiSearchResults: builder.query({
      query: ({ query, limit = 8 }) => ({
        url: "ai-chat/search",
        method: "POST",
        body: { query, limit },
      }),
    }),
  }),
});

export const { useGetAiSearchResultsQuery } = aiApi;
