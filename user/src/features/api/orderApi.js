import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { cartApi } from "./cartApi.js";

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
    markUserNotificationsRead: builder.mutation({
      query: () => ({
        url: `/notifications/read`,
        method: "PATCH",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          orderApi.util.updateQueryData("getUserNotifications", undefined, (draft) => {
            if (!draft?.notifications) return;
            draft.notifications.forEach((notification) => {
              notification.isRead = true;
              notification.readAt = notification.readAt || new Date().toISOString();
            });
          })
        );

        try {
          await queryFulfilled;
        } catch (_error) {
          patchResult.undo();
        }
      },
      invalidatesTags: ["UserNotification"],
    }),
    createOrder: builder.mutation({
      query: (body) => ({
        url: `/create`,
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          const nextOrder = result?.data?.order;
          const isBuyNowCheckout = Array.isArray(arg?.items) && arg.items.length > 0;

          if (!nextOrder) return;

          dispatch(
            orderApi.util.updateQueryData("getUserOrders", undefined, (draft) => {
              if (!draft) {
                return { success: true, orders: [nextOrder] };
              }

              const existingOrders = Array.isArray(draft.orders) ? draft.orders : [];
              draft.success = true;
              draft.orders = [
                nextOrder,
                ...existingOrders.filter((order) => order?._id !== nextOrder._id),
              ];
            })
          );

          if (!isBuyNowCheckout) {
            dispatch(
              cartApi.util.upsertQueryData("getCart", undefined, {
                success: true,
                cart: [],
              })
            );
          }
        } catch (error) {
          console.error(error);
        }
      },
      invalidatesTags: ["Order"],
    }),
    validateCoupon: builder.mutation({
      query: (body) => ({
        url: `/coupon/validate`,
        method: "POST",
        body,
      }),
    }),
    confirmPayment: builder.mutation({
      query: (body) => ({
        url: `/confirm-payment`,
        method: "POST",
        body,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          const nextOrder = result?.data?.order;
          const isBuyNowCheckout = Array.isArray(arg?.items) && arg.items.length > 0;

          if (!nextOrder) return;

          dispatch(
            orderApi.util.updateQueryData("getUserOrders", undefined, (draft) => {
              if (!draft) {
                return { success: true, orders: [nextOrder] };
              }

              const existingOrders = Array.isArray(draft.orders) ? draft.orders : [];
              draft.success = true;
              draft.orders = [
                nextOrder,
                ...existingOrders.filter((order) => order?._id !== nextOrder._id),
              ];
            })
          );

          if (!isBuyNowCheckout) {
            dispatch(
              cartApi.util.upsertQueryData("getCart", undefined, {
                success: true,
                cart: [],
              })
            );
          }
        } catch (error) {
          console.error(error);
        }
      },
      invalidatesTags: ["Order"],
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
  useMarkUserNotificationsReadMutation,
  useCreateOrderMutation,
  useValidateCouponMutation,
  useConfirmPaymentMutation,
  useUpdateOrderStatusMutation,
  useDeleteUserNotificationMutation,
  useClearUserNotificationsMutation,
} = orderApi;
