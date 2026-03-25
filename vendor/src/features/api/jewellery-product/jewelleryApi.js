import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const JEWELLERY_API = `${BASE_URL}/api/v1/vendor/jewellery/`;

export const jewelleryApi = createApi({
  reducerPath: "jewelleryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: JEWELLERY_API,
    credentials: "include",
  }),
  tagTypes: ["Jewellery"],
  endpoints: (builder) => ({
    getJewelleryItems: builder.query({
      query: () => `jewellery-items`,
      providesTags: ["Jewellery"],
    }),
    addJewelleryItem: builder.mutation({
      query: (body) => ({
        url: `jewellery-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Jewellery"],
    }),
    updateJewelleryItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `jewellery-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Jewellery"],
    }),
    deleteJewelleryItem: builder.mutation({
      query: (id) => ({
        url: `jewellery-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Jewellery"],
    }),
    updateJewelleryImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `jewellery-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Jewellery"],
    }),
  }),
});

export const {
  useGetJewelleryItemsQuery,
  useAddJewelleryItemMutation,
  useUpdateJewelleryItemMutation,
  useDeleteJewelleryItemMutation,
  useUpdateJewelleryImagesByIndexMutation,
} = jewelleryApi;
