import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BASE_URL = import.meta.env.VITE_API_URL;
const CATEGORY_API = `${BASE_URL}/api/v1/vendor/category`;

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: CATEGORY_API,
    credentials: "include",
  }),
  tagTypes: ["category"],
  endpoints: (builder) => ({
    addCategory: builder.mutation({
      query: (data) => ({
        url: "add-category",
        method: "POST",
        body: data,
      }),
    }),
    addSubCategory: builder.mutation({
      query: ({ categoryName, name }) => ({
        url: `${categoryName}/sub`,
        method: "POST",
        body: { name },
      }),
    }),
    addThirdLevelSubCategory: builder.mutation({
      query: ({ categoryName, subCategoryName, name }) => ({
        url: `${categoryName}/sub/${subCategoryName}/third`,
        method: "POST",
        body: { name },
      }),
    }),
    getVendorCategories: builder.query({
      query: () => ({
        url: "/category",
        method: "GET",
      }),
      providesTags: ["category"],
    }),
    updateCategory: builder.mutation({
      query: (formdata) => ({
        url: "/category-update",
        method: "PUT",
        body: formdata,
      }),
      invalidatesTags: ["category"],
    }),
    updateSubCategory: builder.mutation({
      query: ({ categoryName, oldSubcategoryName, newSubcategoryName }) => ({
        url: "/sub-update",
        method: "PUT",
        body: { categoryName, oldSubcategoryName, newSubcategoryName },
      }),
      invalidatesTags: ["category"],
    }),
    updateThirdLevelSubCategory: builder.mutation({
      query: ({
        categoryName,
        subCategoryName,
        oldThirdLevelName,
        newThirdLevelName,
      }) => ({
        url: "/third-update",
        method: "PUT",
        body: {
          categoryName,
          subCategoryName,
          oldThirdLevelName,
          newThirdLevelName,
        },
      }),
      invalidatesTags: ["category"],
    }),
    deleteCategory: builder.mutation({
      query: ({ categoryName }) => ({
        url: "/delete-category",
        method: "POST",
        body: { categoryName },
      }),
      invalidatesTags: ["category"],
    }),
    deleteSubCategory: builder.mutation({
      query: ({ categoryName, subCategoryName }) => ({
        url: "/sub-delete",
        method: "POST",
        body: { categoryName, subCategoryName },
      }),
      invalidatesTags: ["category"],
    }),
    deleteThirdLevelSubCategory: builder.mutation({
      query: ({ categoryName, subCategoryName, thirdLevelName }) => ({
        url: "/third-delete",
        method: "POST",
        body: { categoryName, subCategoryName, thirdLevelName },
      }),
      invalidatesTags: ["category"],
    }),
  }),
});

export const {
  useAddCategoryMutation,
  useAddSubCategoryMutation,
  useAddThirdLevelSubCategoryMutation,
  useGetVendorCategoriesQuery,
  useUpdateCategoryMutation,
  useUpdateSubCategoryMutation,
  useUpdateThirdLevelSubCategoryMutation,
  useDeleteCategoryMutation,
  useDeleteSubCategoryMutation,
  useDeleteThirdLevelSubCategoryMutation,
} = categoryApi;
