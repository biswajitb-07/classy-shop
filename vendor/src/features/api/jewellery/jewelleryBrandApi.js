import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const JEWELLERY_BRAND_API = `${BASE_URL}/api/v1/vendor/jewellery-brands/`;

export const jewelleryBrandApi = createApi({
  reducerPath: "jewelleryBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: JEWELLERY_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["JewelleryBrand"],
  endpoints: (builder) => ({
    getJewelleryBrands: builder.query({
      query: () => ({
        url: "jewellery-brand",
        method: "GET",
      }),
      providesTags: ["JewelleryBrand"],
    }),
    addJewelleryBrand: builder.mutation({
      query: (body) => ({
        url: `jewellery-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["JewelleryBrand"],
    }),
    updateJewelleryBrandList: builder.mutation({
      query: (body) => ({
        url: `jewellery-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["JewelleryBrand"],
    }),
    deleteJewelleryBrand: builder.mutation({
      query: (body) => ({
        url: `jewellery-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["JewelleryBrand"],
    }),
  }),
});

export const {
  useGetJewelleryBrandsQuery,
  useAddJewelleryBrandMutation,
  useUpdateJewelleryBrandListMutation,
  useDeleteJewelleryBrandMutation,
} = jewelleryBrandApi;
