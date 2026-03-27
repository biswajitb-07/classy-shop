import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const GROCERY_BRAND_API = `${BASE_URL}/api/v1/vendor/grocery-brands/`;

export const groceryBrandApi = createApi({
  reducerPath: "groceryBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: GROCERY_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["GroceryBrand"],
  endpoints: (builder) => ({
    getGroceryBrands: builder.query({
      query: () => ({
        url: "grocery-brand",
        method: "GET",
      }),
      providesTags: ["GroceryBrand"],
    }),
    addGroceryBrand: builder.mutation({
      query: (body) => ({
        url: `grocery-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["GroceryBrand"],
    }),
    updateGroceryBrandList: builder.mutation({
      query: (body) => ({
        url: `grocery-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["GroceryBrand"],
    }),
    deleteGroceryBrand: builder.mutation({
      query: (body) => ({
        url: `grocery-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["GroceryBrand"],
    }),
  }),
});

export const {
  useGetGroceryBrandsQuery,
  useAddGroceryBrandMutation,
  useUpdateGroceryBrandListMutation,
  useDeleteGroceryBrandMutation,
} = groceryBrandApi;
