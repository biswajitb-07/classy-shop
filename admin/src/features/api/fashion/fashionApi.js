import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FASHION_API = `${BASE_URL}/api/v1/vendor/fashion/`;

export const fashionApi = createApi({
  reducerPath: "fashionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FASHION_API,
    credentials: "include",
  }),
  tagTypes: ["Fashion"],
  endpoints: (builder) => ({
    getFashionItems: builder.query({
      query: () => `fashion-items`,
      providesTags: ["Fashion"],
    }),
    addFashionItem: builder.mutation({
      query: (body) => ({
        url: `fashion-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Fashion"],
    }),
    updateFashionItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `fashion-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Fashion"],
    }),
    deleteFashionItem: builder.mutation({
      query: (id) => ({
        url: `fashion-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fashion"],
    }),
    updateFashionImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `fashion-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Fashion"],
    }),
  }),
});

export const {
  useGetFashionItemsQuery,
  useAddFashionItemMutation,
  useUpdateFashionItemMutation,
  useDeleteFashionItemMutation,
  useUpdateFashionImagesByIndexMutation,
} = fashionApi;
