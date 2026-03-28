import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const newsletterApi = createApi({
  reducerPath: "newsletterApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/api/v1/user/`,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    subscribeNewsletter: builder.mutation({
      query: (payload) => ({
        url: "newsletter/subscribe",
        method: "POST",
        body: payload,
      }),
    }),
  }),
});

export const { useSubscribeNewsletterMutation } = newsletterApi;
