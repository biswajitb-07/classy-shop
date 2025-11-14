import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ORDER_API = `${BASE_URL}/api/v1/product/order`;

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ORDER_API,
    credentials: "include",
  }),
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getUserOrders: builder.query({
      query: () => `/`,
      providesTags: ["Order"],
    }),
    createOrder: builder.mutation({
      query: (body) => ({
        url: `/create`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order", "Cart"],
    }),
    confirmPayment: builder.mutation({
      query: (body) => ({
        url: `/confirm-payment`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Order", "Cart"],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, body }) => ({
        url: `/status/${orderId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Order"],
    }),
  }),
});

export const {
  useGetUserOrdersQuery,
  useCreateOrderMutation,
  useConfirmPaymentMutation,
  useUpdateOrderStatusMutation
} = orderApi;
