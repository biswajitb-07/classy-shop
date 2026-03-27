import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const BEAUTY_BRAND_API = `${BASE_URL}/api/v1/vendor/beauty-brands/`;

export const beautyBrandApi = createApi({
  reducerPath: "beautyBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: BEAUTY_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["BeautyBrand"],
  endpoints: (builder) => ({
    getBeautyBrands: builder.query({
      query: () => ({
        url: "beauty-brand",
        method: "GET",
      }),
      providesTags: ["BeautyBrand"],
    }),
    addBeautyBrand: builder.mutation({
      query: (body) => ({
        url: `beauty-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BeautyBrand"],
    }),
    updateBeautyBrandList: builder.mutation({
      query: (body) => ({
        url: `beauty-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["BeautyBrand"],
    }),
    deleteBeautyBrand: builder.mutation({
      query: (body) => ({
        url: `beauty-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["BeautyBrand"],
    }),
  }),
});

export const {
  useGetBeautyBrandsQuery,
  useAddBeautyBrandMutation,
  useUpdateBeautyBrandListMutation,
  useDeleteBeautyBrandMutation,
} = beautyBrandApi;
