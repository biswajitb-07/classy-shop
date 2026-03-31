import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { userLoggedIn, userLoggedOut } from "../authSlice.js";

const BASE_URL = import.meta.env.VITE_API_URL;
const USER_API = `${BASE_URL}/api/v1/user/`;
const AI_RECOMMENDATION_LOGIN_OPEN_KEY = "ai-recommendation-open-after-login";

const normalizeUser = (user) => ({
  ...user,
  hasPassword: user?.hasPassword ?? Boolean(user?.password),
});

const markRecommendationDialogForLoginOpen = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AI_RECOMMENDATION_LOGIN_OPEN_KEY, "1");
};

const clearRecommendationDialogLoginOpen = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AI_RECOMMENDATION_LOGIN_OPEN_KEY);
};

export const authApi = createApi({
  reducerPath: "authApi",
  // Auth/profile endpoints rely on browser cookies, so we keep credentials
  // enabled on the shared base query instead of repeating it per request.
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
          const nextUser = normalizeUser(result.data.user);
          markRecommendationDialogForLoginOpen();
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              user: nextUser,
            })
          );
          dispatch(userLoggedIn({ user: nextUser }));
        } catch (error) {
          console.error(error);
        }
      },
    }),
    firebaseGoogleLogin: builder.mutation({
      query: ({ idToken, referralCode, referralLinkCode }) => ({
        url: "firebase-google-login",
        method: "POST",
        body: { idToken, referralCode, referralLinkCode },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          // Firebase only proves the Google account identity. The backend still
          // creates the real app session and returns the Mongo user record.
          const result = await queryFulfilled;
          const nextUser = normalizeUser(result.data.user);
          markRecommendationDialogForLoginOpen();
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              user: nextUser,
            })
          );
          dispatch(userLoggedIn({ user: nextUser }));
        } catch (error) {
          console.error(error);
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
          clearRecommendationDialogLoginOpen();
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
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch, getState }) {
        try {
          await queryFulfilled;
          const currentUser = getState()?.auth?.user;

          if (!currentUser) return;

          const nextUser = normalizeUser({
            ...currentUser,
            hasPassword: true,
          });

          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              user: nextUser,
            })
          );
          dispatch(userLoggedIn({ user: nextUser }));
        } catch (error) {
          console.error(error);
        }
      },
    }),
    changePassword: builder.mutation({
      query: ({ currentPassword, newPassword }) => ({
        url: "change-password",
        method: "POST",
        body: { currentPassword, newPassword },
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
          // Refresh or deep-link visits rely on this query to rebuild the
          // authenticated Redux state from the existing cookie session.
          const result = await queryFulfilled;
          const nextUser = normalizeUser(result.data.user);

          dispatch(userLoggedIn({ user: nextUser }));
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
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          const nextUser = normalizeUser(result.data.user);
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              user: nextUser,
            })
          );
          dispatch(userLoggedIn({ user: nextUser }));
        } catch (error) {
          console.error(error);
        }
      },
    }),
    updateUserAddresses: builder.mutation({
      query: (addresses) => ({
        url: "profile/addresses",
        method: "PUT",
        body: { addresses },
      }),
      async onQueryStarted(arg, { queryFulfilled, dispatch }) {
        try {
          const result = await queryFulfilled;
          const nextUser = normalizeUser(result.data.user);
          dispatch(
            authApi.util.upsertQueryData("loadUser", undefined, {
              success: true,
              user: nextUser,
            })
          );
          dispatch(userLoggedIn({ user: nextUser }));
        } catch (error) {
          console.error(error);
        }
      },
    }),
  }),
});

export const {
  useRegisterUserMutation,
  useLoginUserMutation,
  useFirebaseGoogleLoginMutation,
  useLogoutUserMutation,
  useLoadUserQuery,
  useUpdateUserProfileMutation,
  useUpdateUserAddressesMutation,
  useSetPasswordMutation,
  useSendResetOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
