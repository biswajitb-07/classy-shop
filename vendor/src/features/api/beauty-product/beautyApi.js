import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BEAUTY_API = `${BASE_URL}/api/v1/vendor/beauty/`;

export const beautyApi = createApi({
  reducerPath: "beautyApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BEAUTY_API,
    credentials: "include",
  }),
  tagTypes: ["Beauty"],
  endpoints: (builder) => ({
    getBeautyItems: builder.query({
      query: () => `beauty-items`,
      providesTags: ["Beauty"],
    }),
    addBeautyItem: builder.mutation({
      query: (body) => ({
        url: `beauty-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Beauty"],
    }),
    updateBeautyItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `beauty-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Beauty"],
    }),
    deleteBeautyItem: builder.mutation({
      query: (id) => ({
        url: `beauty-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Beauty"],
    }),
    updateBeautyImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `beauty-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Beauty"],
    }),
  }),
});

export const {
  useGetBeautyItemsQuery,
  useAddBeautyItemMutation,
  useUpdateBeautyItemMutation,
  useDeleteBeautyItemMutation,
  useUpdateBeautyImagesByIndexMutation,
} = beautyApi;
