// File guide: supportApi source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;

export const supportApi = createApi({
  reducerPath: "supportApi",
  tagTypes: ["SupportChats"],
  baseQuery: fetchBaseQuery({
    baseUrl: `${BASE_URL}/api/v1/vendor/`,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getSupportConversations: builder.query({
      query: () => ({
        url: "support/conversations",
        method: "GET",
      }),
      providesTags: [{ type: "SupportChats", id: "LIST" }],
    }),
    getSupportConversationDetails: builder.query({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "SupportChats", id: conversationId },
      ],
    }),
    sendSupportReply: builder.mutation({
      query: ({ conversationId, formData }) => ({
        url: `support/conversations/${conversationId}/reply`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: (_result, _error, { conversationId }) => [
        { type: "SupportChats", id: "LIST" },
        { type: "SupportChats", id: conversationId },
      ],
    }),
    deleteSupportConversation: builder.mutation({
      query: (conversationId) => ({
        url: `support/conversations/${conversationId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, conversationId) => [
        { type: "SupportChats", id: "LIST" },
        { type: "SupportChats", id: conversationId },
      ],
    }),
  }),
});

export const {
  useGetSupportConversationsQuery,
  useGetSupportConversationDetailsQuery,
  useSendSupportReplyMutation,
  useDeleteSupportConversationMutation,
} = supportApi;
