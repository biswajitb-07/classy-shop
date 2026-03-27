import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ELECTRONIC_BRAND_API = `${BASE_URL}/api/v1/vendor/electronic-brands/`;

export const electronicBrandApi = createApi({
  reducerPath: "electronicBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ELECTRONIC_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["ElectronicBrand"],
  endpoints: (builder) => ({
    getElectronicBrands: builder.query({
      query: () => ({
        url: "electronic-brand",
        method: "GET",
      }),
      providesTags: ["ElectronicBrand"],
    }),
    addElectronicBrand: builder.mutation({
      query: (body) => ({
        url: `electronic-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["ElectronicBrand"],
    }),
    updateElectronicBrandList: builder.mutation({
      query: (body) => ({
        url: `electronic-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ElectronicBrand"],
    }),
    deleteElectronicBrand: builder.mutation({
      query: (body) => ({
        url: `electronic-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["ElectronicBrand"],
    }),
  }),
});

export const {
  useGetElectronicBrandsQuery,
  useAddElectronicBrandMutation,
  useUpdateElectronicBrandListMutation,
  useDeleteElectronicBrandMutation,
} = electronicBrandApi;
