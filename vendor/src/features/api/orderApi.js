import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ORDER_API = `${BASE_URL}/api/v1/vendor/orders`;

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ORDER_API,
    credentials: "include",
  }),
  tagTypes: ["Order"],
  endpoints: (builder) => ({
    getVendorOrders: builder.query({
      query: () => `/vendor-orders`,
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map((o) => ({ type: "Order", id: o._id })),
              { type: "Order", id: "LIST" },
            ]
          : [{ type: "Order", id: "LIST" }],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, body }) => ({
        url: `/vendor/status/${orderId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Order", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetVendorOrdersQuery, useUpdateOrderStatusMutation } =
  orderApi;
