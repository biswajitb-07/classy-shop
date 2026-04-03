import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const supportApi = createApi({
  reducerPath: "supportApi",
  tagTypes: ["UserSupportChats", "VendorSupportChats"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/api/v1/vendor/`,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getUserSupportConversations: builder.query({
      query: () => ({
        url: "support/conversations",
        method: "GET",
      }),
      providesTags: [{ type: "UserSupportChats", id: "LIST" }],
    }),
    getUserSupportConversationDetails: builder.query({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "UserSupportChats", id: conversationId },
      ],
    }),
    ensureUserSupportConversation: builder.mutation({
      query: (userId) => ({
        url: `support/conversations/users/${userId}`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "UserSupportChats", id: "LIST" }],
    }),
    sendUserSupportReply: builder.mutation({
      query: ({ conversationId, formData }) => ({
        url: `support/conversations/${conversationId}/reply`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: "UserSupportChats", id: "LIST" },
        { type: "UserSupportChats", id: conversationId },
      ],
    }),
    deleteUserSupportConversation: builder.mutation({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, conversationId) => [
        { type: "UserSupportChats", id: "LIST" },
        { type: "UserSupportChats", id: conversationId },
      ],
    }),
    getVendorSupportConversations: builder.query({
      query: () => ({
        url: "admin/vendor-support/conversations",
        method: "GET",
      }),
      providesTags: [{ type: "VendorSupportChats", id: "LIST" }],
    }),
    getVendorSupportConversationDetails: builder.query({
      query: (conversationId) => ({
        url: `admin/vendor-support/conversations/${conversationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "VendorSupportChats", id: conversationId },
      ],
    }),
    ensureVendorSupportConversation: builder.mutation({
      query: (vendorId) => ({
        url: `admin/vendor-support/conversations/vendors/${vendorId}`,
        method: "POST",
      }),
      invalidatesTags: [{ type: "VendorSupportChats", id: "LIST" }],
    }),
    sendVendorSupportReply: builder.mutation({
      query: ({ conversationId, formData }) => ({
        url: `admin/vendor-support/conversations/${conversationId}/reply`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: "VendorSupportChats", id: "LIST" },
        { type: "VendorSupportChats", id: conversationId },
      ],
    }),
    deleteVendorSupportConversation: builder.mutation({
      query: (conversationId) => ({
        url: `admin/vendor-support/conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, conversationId) => [
        { type: "VendorSupportChats", id: "LIST" },
        { type: "VendorSupportChats", id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetUserSupportConversationsQuery,
  useGetUserSupportConversationDetailsQuery,
  useEnsureUserSupportConversationMutation,
  useSendUserSupportReplyMutation,
  useDeleteUserSupportConversationMutation,
  useGetVendorSupportConversationsQuery,
  useGetVendorSupportConversationDetailsQuery,
  useEnsureVendorSupportConversationMutation,
  useSendVendorSupportReplyMutation,
  useDeleteVendorSupportConversationMutation,
} = supportApi;
