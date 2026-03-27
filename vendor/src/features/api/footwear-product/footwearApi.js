import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FOOTWEAR_API = `${BASE_URL}/api/v1/vendor/footwear/`;

export const footwearApi = createApi({
  reducerPath: "footwearApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FOOTWEAR_API,
    credentials: "include",
  }),
  tagTypes: ["Footwear"],
  endpoints: (builder) => ({
    getFootwearItems: builder.query({
      query: () => `footwear-items`,
      providesTags: ["Footwear"],
    }),
    addFootwearItem: builder.mutation({
      query: (body) => ({
        url: `footwear-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Footwear"],
    }),
    updateFootwearItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `footwear-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Footwear"],
    }),
    deleteFootwearItem: builder.mutation({
      query: (id) => ({
        url: `footwear-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Footwear"],
    }),
    updateFootwearImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `footwear-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Footwear"],
    }),
  }),
});

export const {
  useGetFootwearItemsQuery,
  useAddFootwearItemMutation,
  useUpdateFootwearItemMutation,
  useDeleteFootwearItemMutation,
  useUpdateFootwearImagesByIndexMutation,
} = footwearApi;
