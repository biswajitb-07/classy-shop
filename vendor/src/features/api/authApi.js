import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";

const BASE_URL = import.meta.env.VITE_API_URL;
const VENDOR_API = `${BASE_URL}/api/v1/vendor/`;

export const authApi = createApi({
  reducerPath: "authApi",
  tagTypes: [
    "VendorNotifications",
    "DeliveryPartners",
    "VendorPayouts",
  ],
  baseQuery: fetchBaseQuery({
    baseUrl: VENDOR_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    loginUser: builder.mutation({
      query: (inputData) => ({
        url: "login",
        method: "POST",
        body: inputData,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              vendor: result.data.vendor,
            })
          );
          dispatch(userLoggedIn({ vendor: result.data.vendor }));
        } catch (error) {
        }
      },
    }),
    logoutUser: builder.mutation({
      query: () => ({
        url: "logout",
        method: "POST",
      }),
      async onQueryStarted(arg, { dispatch }) {
        try {
          dispatch(userLoggedOut());
        } catch (error) {}
      },
    }),
    changePassword: builder.mutation({
      query: ({ currentPassword, newPassword }) => ({
        url: "change-password",
        method: "POST",
        body: { currentPassword, newPassword },
        credentials: "include",
      }),
    }),
    sendResetOtp: builder.mutation({
      query: (email) => ({
        url: "/send-reset-otp",
        method: "POST",
        body: { email },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ email, otp, newPassword }) => ({
        url: "/reset-password",
        method: "POST",
        body: { email, otp, newPassword },
      }),
    }),
    loadUser: builder.query({
      query: () => ({
        url: "profile",
        method: "GET",
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;

          dispatch(userLoggedIn({ vendor: result.data.vendor }));
        } catch (error) {
          console.log(error);
          dispatch(userLoggedOut());
        }
      },
    }),
    updateUserProfile: builder.mutation({
      query: (FormData) => ({
        url: "profile/update",
        method: "PUT",
        body: FormData,
        credentials: "include",
      }),
    }),
    getDashboardSummary: builder.query({
      query: () => ({
        url: "dashboard-summary",
        method: "GET",
      }),
    }),
    generateProductDescription: builder.mutation({
      query: (body) => ({
        url: "ai/description",
        method: "POST",
        body,
      }),
    }),
    getVendorNotifications: builder.query({
      query: () => ({
        url: "vendor-notifications",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.notifications
          ? [
              ...result.notifications.map((notification) => ({
                type: "VendorNotifications",
                id: notification._id,
              })),
              { type: "VendorNotifications", id: "LIST" },
            ]
          : [{ type: "VendorNotifications", id: "LIST" }],
    }),
    markVendorNotificationsRead: builder.mutation({
      query: () => ({
        url: "vendor-notifications/read",
        method: "PATCH",
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          authApi.util.updateQueryData("getVendorNotifications", undefined, (draft) => {
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
      invalidatesTags: [{ type: "VendorNotifications", id: "LIST" }],
    }),
    deleteVendorNotification: builder.mutation({
      query: (id) => ({
        url: `vendor-notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "VendorNotifications", id },
        { type: "VendorNotifications", id: "LIST" },
      ],
    }),
    clearVendorNotifications: builder.mutation({
      query: () => ({
        url: "vendor-notifications",
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "VendorNotifications", id: "LIST" }],
    }),
    getDeliveryPartners: builder.query({
      query: () => ({
        url: "delivery-partners",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.deliveryPartners
          ? [
              ...result.deliveryPartners.map((deliveryPartner) => ({
                type: "DeliveryPartners",
                id: deliveryPartner._id,
              })),
              { type: "DeliveryPartners", id: "LIST" },
            ]
          : [{ type: "DeliveryPartners", id: "LIST" }],
    }),
    assignDeliveryPartner: builder.mutation({
      query: ({ orderId, deliveryPartnerId }) => ({
        url: `orders/${orderId}/assign-delivery`,
        method: "PATCH",
        body: { deliveryPartnerId },
      }),
      invalidatesTags: [{ type: "DeliveryPartners", id: "LIST" }],
    }),
    getVendorPayoutSummary: builder.query({
      query: () => ({
        url: "payouts/summary",
        method: "GET",
      }),
      providesTags: [{ type: "VendorPayouts", id: "SUMMARY" }],
    }),
    getVendorPayoutRequests: builder.query({
      query: () => ({
        url: "payouts",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.payoutRequests
          ? [
              ...result.payoutRequests.map((request) => ({
                type: "VendorPayouts",
                id: request._id,
              })),
              { type: "VendorPayouts", id: "LIST" },
            ]
          : [{ type: "VendorPayouts", id: "LIST" }],
    }),
    requestVendorPayout: builder.mutation({
      query: (body) => ({
        url: "payouts/request",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "VendorPayouts", id: "SUMMARY" },
        { type: "VendorPayouts", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useUpdateUserProfileMutation,
  useSendResetOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetDashboardSummaryQuery,
  useGenerateProductDescriptionMutation,
  useGetVendorNotificationsQuery,
  useMarkVendorNotificationsReadMutation,
  useDeleteVendorNotificationMutation,
  useClearVendorNotificationsMutation,
  useGetDeliveryPartnersQuery,
  useAssignDeliveryPartnerMutation,
  useGetVendorPayoutSummaryQuery,
  useGetVendorPayoutRequestsQuery,
  useRequestVendorPayoutMutation,
} = authApi;
