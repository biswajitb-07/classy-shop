import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const GROCERY_API = `${BASE_URL}/api/v1/vendor/grocery/`;

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: GROCERY_API,
    credentials: "include",
  }),
  tagTypes: ["Grocery"],
  endpoints: (builder) => ({
    getGroceryItems: builder.query({
      query: () => `grocery-items`,
      providesTags: ["Grocery"],
    }),
    addGroceryItem: builder.mutation({
      query: (body) => ({
        url: `grocery-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Grocery"],
    }),
    updateGroceryItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `grocery-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Grocery"],
    }),
    deleteGroceryItem: builder.mutation({
      query: (id) => ({
        url: `grocery-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Grocery"],
    }),
    updateGroceryImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `grocery-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Grocery"],
    }),
  }),
});

export const {
  useGetGroceryItemsQuery,
  useAddGroceryItemMutation,
  useUpdateGroceryItemMutation,
  useDeleteGroceryItemMutation,
  useUpdateGroceryImagesByIndexMutation,
} = groceryApi;
