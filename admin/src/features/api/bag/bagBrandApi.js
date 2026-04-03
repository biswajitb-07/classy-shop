import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BAG_BRAND_API = `${BASE_URL}/api/v1/vendor/bag-brands/`;

export const bagBrandApi = createApi({
  reducerPath: "bagBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BAG_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["BagBrand"],
  endpoints: (builder) => ({
    getBagBrands: builder.query({
      query: () => ({
        url: "bag-brand",
        method: "GET",
      }),
      providesTags: ["BagBrand"],
    }),
    addBagBrand: builder.mutation({
      query: (body) => ({
        url: `bag-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BagBrand"],
    }),
    updateBagBrandList: builder.mutation({
      query: (body) => ({
        url: `bag-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["BagBrand"],
    }),
    deleteBagBrand: builder.mutation({
      query: (body) => ({
        url: `bag-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["BagBrand"],
    }),
  }),
});

export const {
  useGetBagBrandsQuery,
  useAddBagBrandMutation,
  useUpdateBagBrandListMutation,
  useDeleteBagBrandMutation,
} = bagBrandApi;
