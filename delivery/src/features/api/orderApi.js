import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
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
  }),
});

export const { useGetAssignedOrdersQuery, useUpdateOrderStatusMutation } =
  orderApi;
