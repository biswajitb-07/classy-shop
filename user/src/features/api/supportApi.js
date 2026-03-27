// File guide: supportApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const supportApi = createApi({
  reducerPath: "supportApi",
  tagTypes: ["SupportConversation"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/api/v1/user/`,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getSupportConversations: builder.query({
      query: () => ({
        url: "support/conversations",
        method: "GET",
      }),
      providesTags: [{ type: "SupportConversation", id: "LIST" }],
    }),
    createSupportConversation: builder.mutation({
      query: () => ({
        url: "support/conversations",
        method: "POST",
      }),
      invalidatesTags: [{ type: "SupportConversation", id: "LIST" }],
    }),
    getSupportConversation: builder.query({
      query: () => ({
        url: "support/conversation",
        method: "GET",
      }),
      providesTags: [{ type: "SupportConversation", id: "SELF" }],
    }),
    getSupportConversationDetails: builder.query({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "SupportConversation", id: conversationId },
      ],
    }),
    sendSupportMessage: builder.mutation({
      query: (formData) => ({
        url: "support/message",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "SupportConversation", id: "SELF" }, { type: "SupportConversation", id: "LIST" }],
    }),
    deleteSupportConversation: builder.mutation({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, conversationId) => [
        { type: "SupportConversation", id: "SELF" },
        { type: "SupportConversation", id: "LIST" },
        { type: "SupportConversation", id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetSupportConversationsQuery,
  useCreateSupportConversationMutation,
  useGetSupportConversationQuery,
  useGetSupportConversationDetailsQuery,
  useSendSupportMessageMutation,
  useDeleteSupportConversationMutation,
} = supportApi;
