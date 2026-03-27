// File guide: groceryApi source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const GROCERY_API = `${BASE_URL}/api/v1/vendor/grocery/`;

export const groceryApi = createApi({
  reducerPath: "groceryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: GROCERY_API,
    credentials: "include",
  }),
  endpoints: (builder) => ({
    getGroceryItems: builder.query({
      query: () => "all-grocery-items",
    }),
  }),
});

export const { useGetGroceryItemsQuery } = groceryApi;
