import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const CONTENT_API = `${BASE_URL}/api/v1/vendor/site-content`;

export const contentApi = createApi({
  reducerPath: "contentApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CONTENT_API,
    credentials: "include",
  }),
  tagTypes: ["SiteContent"],
  endpoints: (builder) => ({
    getSiteContent: builder.query({
      query: () => ({
        url: "/",
        method: "GET",
      }),
      providesTags: ["SiteContent"],
    }),
    addSiteContentItem: builder.mutation({
      query: ({ section, body }) => ({
        url: `/${section}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SiteContent"],
    }),
    updateSiteContentItem: builder.mutation({
      query: ({ section, itemId, body }) => ({
        url: `/${section}/${itemId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["SiteContent"],
    }),
    deleteSiteContentItem: builder.mutation({
      query: ({ section, itemId }) => ({
        url: `/${section}/${itemId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SiteContent"],
    }),
  }),
});

export const {
  useGetSiteContentQuery,
  useAddSiteContentItemMutation,
  useUpdateSiteContentItemMutation,
  useDeleteSiteContentItemMutation,
} = contentApi;
