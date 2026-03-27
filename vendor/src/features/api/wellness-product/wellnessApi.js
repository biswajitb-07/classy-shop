// File guide: wellnessApi source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const WELLNESS_API = `${BASE_URL}/api/v1/vendor/wellness/`;

export const wellnessApi = createApi({
  reducerPath: "wellnessApi",
  baseQuery: fetchBaseQuery({
    baseUrl: WELLNESS_API,
    credentials: "include",
  }),
  tagTypes: ["Wellness"],
  endpoints: (builder) => ({
    getWellnessItems: builder.query({
      query: () => `wellness-items`,
      providesTags: ["Wellness"],
    }),
    addWellnessItem: builder.mutation({
      query: (body) => ({
        url: `wellness-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Wellness"],
    }),
    updateWellnessItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `wellness-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Wellness"],
    }),
    deleteWellnessItem: builder.mutation({
      query: (id) => ({
        url: `wellness-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Wellness"],
    }),
    updateWellnessImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `wellness-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Wellness"],
    }),
  }),
});

export const {
  useGetWellnessItemsQuery,
  useAddWellnessItemMutation,
  useUpdateWellnessItemMutation,
  useDeleteWellnessItemMutation,
  useUpdateWellnessImagesByIndexMutation,
} = wellnessApi;
