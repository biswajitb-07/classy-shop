import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";
import { resolveApiBaseUrl } from "../../lib/apiBase";

const BASE_URL = resolveApiBaseUrl();
const DELIVERY_API = `${BASE_URL}/api/v1/delivery/`;

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: DELIVERY_API,
    credentials: "include",
  }),
  tagTypes: [
    "DeliveryProfile",
    "DeliverySummary",
    "DeliveryNotifications",
  ],
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: (body) => ({
        url: "login",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              deliveryPartner: result.data.deliveryPartner,
            })
          );
          dispatch(
            userLoggedIn({ deliveryPartner: result.data.deliveryPartner })
          );
        } catch (_error) {}
      },
    }),
    logoutUser: builder.mutation({
      query: () => ({
        url: "logout",
        method: "POST",
      }),
      async onQueryStarted(_arg, { dispatch }) {
        dispatch(userLoggedOut());
      },
    }),
    loadUser: builder.query({
      query: () => ({
        url: "profile",
        method: "GET",
      }),
      providesTags: [{ type: "DeliveryProfile", id: "ME" }],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            userLoggedIn({ deliveryPartner: result.data.deliveryPartner })
          );
        } catch (_error) {
          dispatch(userLoggedOut());
        }
      },
    }),
    getDashboardSummary: builder.query({
      query: () => ({
        url: "dashboard-summary",
        method: "GET",
      }),
      providesTags: [{ type: "DeliverySummary", id: "HOME" }],
    }),
    toggleAvailability: builder.mutation({
      query: (isAvailable) => ({
        url: "availability",
        method: "PATCH",
        body: { isAvailable },
      }),
      invalidatesTags: [
        { type: "DeliveryProfile", id: "ME" },
        { type: "DeliverySummary", id: "HOME" },
      ],
    }),
    getDeliveryNotifications: builder.query({
      query: () => ({
        url: "notifications",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.notifications
          ? [
              ...result.notifications.map((notification) => ({
                type: "DeliveryNotifications",
                id: notification._id,
              })),
              { type: "DeliveryNotifications", id: "LIST" },
            ]
          : [{ type: "DeliveryNotifications", id: "LIST" }],
    }),
    deleteDeliveryNotification: builder.mutation({
      query: (id) => ({
        url: `notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "DeliveryNotifications", id },
        { type: "DeliveryNotifications", id: "LIST" },
      ],
    }),
    clearDeliveryNotifications: builder.mutation({
      query: () => ({
        url: "notifications",
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DeliveryNotifications", id: "LIST" }],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useGetDashboardSummaryQuery,
  useToggleAvailabilityMutation,
  useGetDeliveryNotificationsQuery,
  useDeleteDeliveryNotificationMutation,
  useClearDeliveryNotificationsMutation,
} = authApi;
