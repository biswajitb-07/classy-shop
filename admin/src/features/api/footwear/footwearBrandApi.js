import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const FOOTWEAR_BRAND_API = `${BASE_URL}/api/v1/vendor/footwear-brands/`;

export const footwearBrandApi = createApi({
  reducerPath: "footwearBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: FOOTWEAR_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["FootwearBrand"],
  endpoints: (builder) => ({
    getFootwearBrands: builder.query({
      query: () => ({
        url: "footwear-brand",
        method: "GET",
      }),
      providesTags: ["FootwearBrand"],
    }),
    addFootwearBrand: builder.mutation({
      query: (body) => ({
        url: `footwear-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["FootwearBrand"],
    }),
    updateFootwearBrandList: builder.mutation({
      query: (body) => ({
        url: `footwear-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["FootwearBrand"],
    }),
    deleteFootwearBrand: builder.mutation({
      query: (body) => ({
        url: `footwear-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["FootwearBrand"],
    }),
  }),
});

export const {
  useGetFootwearBrandsQuery,
  useAddFootwearBrandMutation,
  useUpdateFootwearBrandListMutation,
  useDeleteFootwearBrandMutation,
} = footwearBrandApi;
