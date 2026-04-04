import { useMemo } from "react";
import { useGetFashionItemsQuery } from "../features/api/fashionApi.js";
import { useGetElectronicItemsQuery } from "../features/api/electronicApi.js";
import { useGetBagItemsQuery } from "../features/api/bagApi.js";
import { useGetFootwearItemsQuery } from "../features/api/footwearApi.js";
import { useGetGroceryItemsQuery } from "../features/api/groceryApi.js";
import { useGetBeautyItemsQuery } from "../features/api/beautyApi.js";
import { useGetWellnessItemsQuery } from "../features/api/wellnessApi.js";
import { useGetJewelleryItemsQuery } from "../features/api/jewelleryApi.js";
import { normalizeHomeProduct } from "../utils/productCatalog.js";

const CATEGORY_SOURCES = [
  {
    key: "Fashion",
    label: "Fashion",
    query: useGetFashionItemsQuery,
    responseKey: "fashionItems",
  },
  {
    key: "Electronics",
    label: "Electronics",
    query: useGetElectronicItemsQuery,
    responseKey: "electronicItems",
  },
  {
    key: "Bag",
    label: "Bags",
    query: useGetBagItemsQuery,
    responseKey: "bagItems",
  },
  {
    key: "Footwear",
    label: "Footwear",
    query: useGetFootwearItemsQuery,
    responseKey: "footwearItems",
  },
  {
    key: "Grocery",
    label: "Groceries",
    query: useGetGroceryItemsQuery,
    responseKey: "groceryItems",
  },
  {
    key: "Beauty",
    label: "Beauty",
    query: useGetBeautyItemsQuery,
    responseKey: "beautyItems",
  },
  {
    key: "Wellness",
    label: "Wellness",
    query: useGetWellnessItemsQuery,
    responseKey: "wellnessItems",
  },
  {
    key: "Jewellery",
    label: "Jewellery",
    query: useGetJewelleryItemsQuery,
    responseKey: "jewelleryItems",
  },
];

const getTimestamp = (product) => {
  const value = product?.createdAt || product?.updatedAt || product?.date;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRecencyScore = (product) => {
  const timestamp = getTimestamp(product);
  if (!timestamp) return 0;

  const ageInDays = Math.max(
    0,
    (Date.now() - timestamp) / (1000 * 60 * 60 * 24),
  );

  if (ageInDays <= 3) return 36;
  if (ageInDays <= 7) return 26;
  if (ageInDays <= 15) return 18;
  if (ageInDays <= 30) return 10;
  return 0;
};

const getDiscountScore = (product) => {
  const originalPrice = getNumber(product?.originalPrice);
  const discountedPrice = getNumber(product?.discountedPrice);
  if (!originalPrice || !discountedPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  const percentage = ((originalPrice - discountedPrice) / originalPrice) * 100;
  if (percentage >= 50) return 18;
  if (percentage >= 35) return 14;
  if (percentage >= 20) return 10;
  if (percentage >= 10) return 6;
  return 2;
};

const getStockScore = (product) => {
  const stock = getNumber(product?.inStock);
  if (stock <= 0) return -40;
  if (stock <= 3) return 3;
  if (stock <= 10) return 6;
  if (stock <= 25) return 10;
  return 12;
};

const getPopularityScore = (product) => {
  const rating = getNumber(product?.rating);
  const reviews = getNumber(product?.reviews);

  return (
    rating * 30 +
    Math.min(reviews, 250) * 1.8 +
    getRecencyScore(product) +
    getDiscountScore(product) +
    getStockScore(product)
  );
};

const getFeaturedScore = (product) => {
  const rating = getNumber(product?.rating);
  const reviews = getNumber(product?.reviews);

  return (
    rating * 42 +
    Math.min(reviews, 200) * 1.5 +
    getDiscountScore(product) * 1.4 +
    getStockScore(product) +
    getRecencyScore(product) * 0.8
  );
};

const sortByNewest = (products = []) =>
  [...products].sort((left, right) => getTimestamp(right) - getTimestamp(left));

const sortByPopularity = (products = []) =>
  [...products].sort((left, right) => {
    const popularityDelta = getPopularityScore(right) - getPopularityScore(left);
    if (popularityDelta !== 0) return popularityDelta;

    const ratingDelta = getNumber(right?.rating) - getNumber(left?.rating);
    if (ratingDelta !== 0) return ratingDelta;

    const reviewDelta = getNumber(right?.reviews) - getNumber(left?.reviews);
    if (reviewDelta !== 0) return reviewDelta;

    return getTimestamp(right) - getTimestamp(left);
  });

const sortByFeatured = (products = []) =>
  [...products].sort((left, right) => {
    const featuredDelta = getFeaturedScore(right) - getFeaturedScore(left);
    if (featuredDelta !== 0) return featuredDelta;

    const popularityDelta = getPopularityScore(right) - getPopularityScore(left);
    if (popularityDelta !== 0) return popularityDelta;

    return getTimestamp(right) - getTimestamp(left);
  });

export const useHomeCatalog = () => {
  const fashion = useGetFashionItemsQuery();
  const electronics = useGetElectronicItemsQuery();
  const bags = useGetBagItemsQuery();
  const footwear = useGetFootwearItemsQuery();
  const grocery = useGetGroceryItemsQuery();
  const beauty = useGetBeautyItemsQuery();
  const wellness = useGetWellnessItemsQuery();
  const jewellery = useGetJewelleryItemsQuery();

  const queryResults = {
    Fashion: fashion,
    Electronics: electronics,
    Bag: bags,
    Footwear: footwear,
    Grocery: grocery,
    Beauty: beauty,
    Wellness: wellness,
    Jewellery: jewellery,
  };

  const categories = useMemo(
    () =>
      CATEGORY_SOURCES.map((source) => {
        const queryResult = queryResults[source.key];
        const rawProducts = queryResult?.data?.[source.responseKey] || [];
        const products = rawProducts.map((product) =>
          normalizeHomeProduct(product, source.key)
        );

        return {
          key: source.key,
          label: source.label,
          products,
          isLoading: Boolean(queryResult?.isLoading),
        };
      }).filter((category) => category.isLoading || category.products.length > 0),
    [beauty, bags, electronics, fashion, footwear, grocery, jewellery, wellness]
  );

  const allProducts = useMemo(
    () => categories.flatMap((category) => category.products),
    [categories]
  );

  const featuredProducts = useMemo(
    () =>
      sortByFeatured(allProducts).slice(0, 10),
    [allProducts]
  );

  const latestProducts = useMemo(
    () => sortByNewest(allProducts).slice(0, 10),
    [allProducts]
  );

  const popularProductsByCategory = useMemo(
    () =>
      categories.reduce((accumulator, category) => {
        accumulator[category.key] = sortByPopularity(category.products);
        return accumulator;
      }, {}),
    [categories]
  );

  return {
    categories,
    allProducts,
    featuredProducts,
    latestProducts,
    popularProductsByCategory,
    isLoading: Object.values(queryResults).some((result) => result.isLoading),
  };
};
