import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";

const BASE_URL = import.meta.env.VITE_API_URL;
const VENDOR_API = `${BASE_URL}/api/v1/vendor/`;

export const authApi = createApi({
  reducerPath: "authApi",
  tagTypes: [
    "VendorNotifications",
    "NewsletterSubscribers",
    "Coupons",
    "DeliveryPartners",
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
    getUsers: builder.query({
      query: () => ({
        url: "users",
        method: "GET",
      }),
    }),
    getVendors: builder.query({
      query: () => ({
        url: "vendors",
        method: "GET",
      }),
    }),
    getNewsletterSubscribers: builder.query({
      query: () => ({
        url: "newsletter/subscribers",
        method: "GET",
      }),
      providesTags: [{ type: "NewsletterSubscribers", id: "LIST" }],
    }),
    createVendor: builder.mutation({
      query: (body) => ({
        url: "vendors",
        method: "POST",
        body,
      }),
    }),
    updateUserById: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `users/${id}`,
        method: "PUT",
        body,
      }),
    }),
    deleteUserById: builder.mutation({
      query: (id) => ({
        url: `users/${id}`,
        method: "DELETE",
      }),
    }),
    toggleUserBlock: builder.mutation({
      query: ({ id, isBlocked }) => ({
        url: `users/${id}/block`,
        method: "PATCH",
        body: { isBlocked },
      }),
    }),
    updateVendorById: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `vendors/${id}`,
        method: "PUT",
        body,
      }),
    }),
    deleteVendorById: builder.mutation({
      query: (id) => ({
        url: `vendors/${id}`,
        method: "DELETE",
      }),
    }),
    toggleVendorBlock: builder.mutation({
      query: ({ id, isBlocked }) => ({
        url: `vendors/${id}/block`,
        method: "PATCH",
        body: { isBlocked },
      }),
    }),
    getVendorNotifications: builder.query({
      query: () => ({
        url: "notifications",
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
    deleteVendorNotification: builder.mutation({
      query: (id) => ({
        url: `notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "VendorNotifications", id },
        { type: "VendorNotifications", id: "LIST" },
      ],
    }),
    clearVendorNotifications: builder.mutation({
      query: () => ({
        url: "notifications",
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "VendorNotifications", id: "LIST" }],
    }),
    getCoupons: builder.query({
      query: () => ({
        url: "coupons",
        method: "GET",
      }),
      providesTags: (result) =>
        result?.coupons
          ? [
              ...result.coupons.map((coupon) => ({
                type: "Coupons",
                id: coupon._id,
              })),
              { type: "Coupons", id: "LIST" },
            ]
          : [{ type: "Coupons", id: "LIST" }],
    }),
    createCoupon: builder.mutation({
      query: (body) => ({
        url: "coupons",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Coupons", id: "LIST" }],
    }),
    toggleCouponStatus: builder.mutation({
      query: (id) => ({
        url: `coupons/${id}/toggle`,
        method: "PATCH",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Coupons", id },
        { type: "Coupons", id: "LIST" },
      ],
    }),
    deleteCoupon: builder.mutation({
      query: (id) => ({
        url: `coupons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Coupons", id },
        { type: "Coupons", id: "LIST" },
      ],
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
    createDeliveryPartner: builder.mutation({
      query: (body) => ({
        url: "delivery-partners",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "DeliveryPartners", id: "LIST" }],
    }),
    toggleDeliveryPartnerBlock: builder.mutation({
      query: ({ id, isBlocked }) => ({
        url: `delivery-partners/${id}/block`,
        method: "PATCH",
        body: { isBlocked },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "DeliveryPartners", id },
        { type: "DeliveryPartners", id: "LIST" },
      ],
    }),
    deleteDeliveryPartner: builder.mutation({
      query: (id) => ({
        url: `delivery-partners/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "DeliveryPartners", id },
        { type: "DeliveryPartners", id: "LIST" },
      ],
    }),
    assignDeliveryPartner: builder.mutation({
      query: ({ orderId, deliveryPartnerId }) => ({
        url: `orders/${orderId}/assign-delivery`,
        method: "PATCH",
        body: { deliveryPartnerId },
      }),
      invalidatesTags: [{ type: "DeliveryPartners", id: "LIST" }],
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useUpdateUserProfileMutation,
  useSendResetOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetDashboardSummaryQuery,
  useGetUsersQuery,
  useGetVendorsQuery,
  useGetNewsletterSubscribersQuery,
  useCreateVendorMutation,
  useUpdateUserByIdMutation,
  useDeleteUserByIdMutation,
  useToggleUserBlockMutation,
  useUpdateVendorByIdMutation,
  useDeleteVendorByIdMutation,
  useToggleVendorBlockMutation,
  useGetVendorNotificationsQuery,
  useDeleteVendorNotificationMutation,
  useClearVendorNotificationsMutation,
  useGetCouponsQuery,
  useCreateCouponMutation,
  useToggleCouponStatusMutation,
  useDeleteCouponMutation,
  useGetDeliveryPartnersQuery,
  useCreateDeliveryPartnerMutation,
  useToggleDeliveryPartnerBlockMutation,
  useDeleteDeliveryPartnerMutation,
  useAssignDeliveryPartnerMutation,
} = authApi;
