import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { resolveApiBaseUrl } from "../../lib/apiBase";

const BASE_URL = resolveApiBaseUrl();
const DELIVERY_API = `${BASE_URL}/api/v1/delivery/`;

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: DELIVERY_API,
    credentials: "include",
  }),
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getAssignedOrders: builder.query({
      query: () => ({
        url: "orders",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.orders
          ? [
              ...result.orders.map((order) => ({ type: "Order", id: order._id })),
              { type: "Order", id: "LIST" },
            ]
          : [{ type: "Order", id: "LIST" }],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, body }) => ({
        url: `orders/${orderId}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
    sendDeliveryCompletionOtp: builder.mutation({
      query: (orderId) => ({
        url: `orders/${orderId}/delivery-otp/send`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
    verifyDeliveryCompletionOtp: builder.mutation({
      query: ({ orderId, otp }) => ({
        url: `orders/${orderId}/delivery-otp/verify`,
        method: "POST",
        body: { otp },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAssignedOrdersQuery,
  useUpdateOrderStatusMutation,
  useSendDeliveryCompletionOtpMutation,
  useVerifyDeliveryCompletionOtpMutation,
} = orderApi;
