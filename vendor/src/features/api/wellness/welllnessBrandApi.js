import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const WELLNESS_BRAND_API = `${BASE_URL}/api/v1/vendor/wellness-brands/`;

export const wellnessBrandApi = createApi({
  reducerPath: "wellnessBrandApi",
  baseQuery: fetchBaseQuery({
    baseUrl: WELLNESS_BRAND_API,
    credentials: "include",
  }),
  tagTypes: ["WellnessBrand"],
  endpoints: (builder) => ({
    getWellnessBrands: builder.query({
      query: () => ({
        url: "wellness-brand",
        method: "GET",
      }),
      providesTags: ["WellnessBrand"],
    }),
    addWellnessBrand: builder.mutation({
      query: (body) => ({
        url: `wellness-brand`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["WellnessBrand"],
    }),
    updateWellnessBrandList: builder.mutation({
      query: (body) => ({
        url: `wellness-brand`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["WellnessBrand"],
    }),
    deleteWellnessBrand: builder.mutation({
      query: (body) => ({
        url: `wellness-brand`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["WellnessBrand"],
    }),
  }),
});

export const {
  useGetWellnessBrandsQuery,
  useAddWellnessBrandMutation,
  useUpdateWellnessBrandListMutation,
  useDeleteWellnessBrandMutation,
} = wellnessBrandApi;
