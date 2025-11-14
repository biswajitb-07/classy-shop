import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const CART_API = `${BASE_URL}/api/v1/product/`;

export const cartApi = createApi({
  reducerPath: "cartApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CART_API,
    credentials: "include",
  }),
  tagTypes: ["Cart", "Wishlist"],
  endpoints: (builder) => ({
    getCart: builder.query({
      query: () => `/cart`,
      providesTags: ["Cart"],
    }),
    addToCart: builder.mutation({
      query: (body) => ({
        url: `/cart/add`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Cart"],
    }),
    updateCartQuantity: builder.mutation({
      query: (body) => ({
        url: `/cart/update`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Cart"],
    }),
    removeFromCart: builder.mutation({
      query: (body) => ({
        url: `/cart/remove`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Cart"],
    }),

    getWishlist: builder.query({
      query: () => `/wishlist`,
      providesTags: ["Wishlist"],
    }),
    addToWishlist: builder.mutation({
      query: (body) => ({
        url: `/wishlist/add`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Wishlist"],
    }),
    removeFromWishlist: builder.mutation({
      query: (body) => ({
        url: `/wishlist/remove`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Wishlist"],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartQuantityMutation,
  useRemoveFromCartMutation,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} = cartApi;
