import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice";

const BASE_URL = import.meta.env.VITE_API_URL;
const DELIVERY_API = `${BASE_URL}/api/v1/delivery/`;

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: DELIVERY_API,
    credentials: "include",
  }),
  tagTypes: ["DeliveryProfile", "DeliverySummary"],
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
        method: "GET",
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
  }),
});

export const {
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useGetDashboardSummaryQuery,
  useToggleAvailabilityMutation,
} = authApi;
