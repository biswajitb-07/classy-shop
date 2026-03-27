// File guide: orderApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const ORDER_API = `${BASE_URL}/api/v1/product/order`;

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: fetchBaseQuery({
    baseUrl: ORDER_API,
    credentials: "include",
  }),
  tagTypes: ["Order", "UserNotification"],
  endpoints: (builder) => ({
    getUserOrders: builder.query({
      query: () => `/`,
      providesTags: ["Order"],
    }),
    getUserNotifications: builder.query({
      query: () => `/notifications`,
      providesTags: (result) =>
        result?.notifications
          ? [
              "UserNotification",
              ...result.notifications.map((notification) => ({
                type: "UserNotification",
                id: notification._id,
              })),
            ]
          : ["UserNotification"],
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
      invalidatesTags: ["Order", "UserNotification"],
    }),
    deleteUserNotification: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        "UserNotification",
        { type: "UserNotification", id },
      ],
    }),
    clearUserNotifications: builder.mutation({
      query: () => ({
        url: `/notifications`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserNotification"],
    }),
  }),
});

export const {
  useGetUserOrdersQuery,
  useGetUserNotificationsQuery,
  useCreateOrderMutation,
  useConfirmPaymentMutation,
  useUpdateOrderStatusMutation
  ,
  useDeleteUserNotificationMutation,
  useClearUserNotificationsMutation,
} = orderApi;
