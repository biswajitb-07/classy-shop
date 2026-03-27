import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ELECTRONIC_API = `${BASE_URL}/api/v1/vendor/electronic/`;

export const electronicApi = createApi({
  reducerPath: "electronicApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ELECTRONIC_API,
    credentials: "include",
  }),
  tagTypes: ["Electronic"],
  endpoints: (builder) => ({
    getElectronicItems: builder.query({
      query: () => `electronic-items`,
      providesTags: ["Electronic"],
    }),
    addElectronicItem: builder.mutation({
      query: (body) => ({
        url: `electronic-items`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Electronic"],
    }),
    updateElectronicItem: builder.mutation({
      query: ({ id, body }) => ({
        url: `electronic-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Electronic"],
    }),
    deleteElectronicItem: builder.mutation({
      query: (id) => ({
        url: `electronic-items/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Electronic"],
    }),
    updateElectronicImagesByIndex: builder.mutation({
      query: ({ id, body }) => ({
        url: `electronic-items/update-multiple-images/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Electronic"],
    }),
  }),
});

export const {
  useGetElectronicItemsQuery,
  useAddElectronicItemMutation,
  useUpdateElectronicItemMutation,
  useDeleteElectronicItemMutation,
  useUpdateElectronicImagesByIndexMutation,
} = electronicApi;
