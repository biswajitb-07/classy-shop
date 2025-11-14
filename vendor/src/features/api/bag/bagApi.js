import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BAG_API = `${BASE_URL}/api/v1/vendor/bag/`;

export const bagApi = createApi({
  reducerPath: "bagApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BAG_API,
    credentials: "include",
  }),
  tagTypes: ["Bag"],
  endpoints: (builder) => ({
    getBagItems: builder.query({
      query: () => `bag-items`,
      providesTags: ["Bag"],
    }),
    addBagItem: builder.mutation({
      query: (body) => ({
        url: `bag-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Bag"],
    }),
    updateBagItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `bag-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Bag"],
    }),
    deleteBagItem: builder.mutation({
      query: (id) => ({
        url: `bag-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Bag"],
    }),
    updateBagImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `bag-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Bag"],
    }),
  }),
});

export const {
  useGetBagItemsQuery,
  useAddBagItemMutation,
  useUpdateBagItemMutation,
  useDeleteBagItemMutation,
  useUpdateBagImagesByIndexMutation,
} = bagApi;
