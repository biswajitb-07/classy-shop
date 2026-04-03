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
        url: "admin-support/conversations",
        method: "GET",
      }),
      providesTags: [{ type: "SupportChats", id: "LIST" }],
    }),
    getSupportConversationDetails: builder.query({
      query: (conversationId) => ({
        url: `admin-support/conversations/${conversationId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, conversationId) => [
        { type: "SupportChats", id: conversationId },
      ],
    }),
    sendSupportReply: builder.mutation({
      query: ({ conversationId, formData }) => ({
        url: `admin-support/conversations/${conversationId}/reply`,
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
        url: `admin-support/conversations/${conversationId}`,
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
