import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const REVIEW_API = `${BASE_URL}/api/v1/user/`;

const toQueryString = (params) =>
  new URLSearchParams(
    Object.entries(params || {}).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {})
  ).toString();

export const reviewApi = createApi({
  reducerPath: "reviewApi",
  baseQuery: fetchBaseQuery({
    baseUrl: REVIEW_API,
    credentials: "include",
  }),
  tagTypes: ["ProductReview", "ProductReviewMeta"],
  endpoints: (builder) => ({
    getProductReviews: builder.query({
      query: ({ productId, productType }) => ({
        url: `reviews?${toQueryString({ productId, productType })}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { productId, productType }) => [
        { type: "ProductReview", id: `${productType}:${productId}` },
      ],
    }),
    getProductReviewMeta: builder.query({
      query: ({ productId, productType }) => ({
        url: `reviews/meta?${toQueryString({ productId, productType })}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { productId, productType }) => [
        { type: "ProductReviewMeta", id: `${productType}:${productId}` },
      ],
    }),
    upsertProductReview: builder.mutation({
      query: (body) => ({
        url: "reviews",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { productId, productType }) => [
        { type: "ProductReview", id: `${productType}:${productId}` },
        { type: "ProductReviewMeta", id: `${productType}:${productId}` },
      ],
    }),
    deleteProductReview: builder.mutation({
      query: ({ productId, productType }) => ({
        url: `reviews?${toQueryString({ productId, productType })}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { productId, productType }) => [
        { type: "ProductReview", id: `${productType}:${productId}` },
        { type: "ProductReviewMeta", id: `${productType}:${productId}` },
      ],
    }),
  }),
});

export const {
  useGetProductReviewsQuery,
  useGetProductReviewMetaQuery,
  useUpsertProductReviewMutation,
  useDeleteProductReviewMutation,
} = reviewApi;
