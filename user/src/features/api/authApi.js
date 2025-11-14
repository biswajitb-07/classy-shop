import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice.js";

const BASE_URL = import.meta.env.VITE_API_URL;
const USER_API = `${BASE_URL}/api/v1/user/`;

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: USER_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    registerUser: builder.mutation({
      query: (inputData) => ({
        url: "register",
        method: "POST",
        body: inputData,
      }),
    }),
    loginUser: builder.mutation({
      query: (inputData) => ({
        url: "login",
        method: "POST",
        body: inputData,
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          dispatch(userLoggedIn({ user: result.data.user }));
        } catch (error) {
          console.error(error);
        }
      },
    }),
    logoutUser: builder.mutation({
      query: () => ({
        url: "logout",
        method: "GET",
      }),
      async onQueryStarted(arg, { dispatch }) {
        try {
          dispatch(userLoggedOut());
        } catch (error) {
          console.error(error);
        }
      },
    }),
    setPassword: builder.mutation({
      query: (password) => ({
        url: "set-password",
        method: "POST",
        body: { password },
        credentials: "include",
      }),
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

          dispatch(userLoggedIn({ user: result.data.user }));
        } catch (error) {
          console.log(error);
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
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useUpdateUserProfileMutation,
  useSetPasswordMutation,
  useSendResetOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
