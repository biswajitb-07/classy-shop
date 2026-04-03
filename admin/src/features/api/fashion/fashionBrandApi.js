import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FASHION_BRAND_API = `${BASE_URL}/api/v1/vendor/brands/`;

export const fashionBrandApi = createApi({
  reducerPath: "fashionBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FASHION_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["FashionBrand"],
  endpoints: (builder) => ({
    getBrands: builder.query({
      query: () => ({
        url: "fashion-brand",
        method: "GET",
      }),
      providesTags: ["FashionBrand"],
    }),
    addBrand: builder.mutation({
      query: (body) => ({
        url: `fashion-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["FashionBrand"],
    }),
    updateBrandList: builder.mutation({
      query: (body) => ({
        url: `fashion-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FashionBrand"],
    }),
    deleteBrand: builder.mutation({
      query: (body) => ({
        url: `fashion-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["FashionBrand"],
    }),
  }),
});

export const {
  useGetBrandsQuery,
  useAddBrandMutation,
  useUpdateBrandListMutation,
  useDeleteBrandMutation,
} = fashionBrandApi;
