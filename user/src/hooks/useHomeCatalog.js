import { useMemo, useRef } from "react";
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

const buildSeededRandom = (seed) => {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

const shuffleProducts = (products, seed) => {
  const random = buildSeededRandom(seed);
  const nextProducts = [...products];

  for (let index = nextProducts.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextProducts[index], nextProducts[swapIndex]] = [
      nextProducts[swapIndex],
      nextProducts[index],
    ];
  }

  return nextProducts;
};

export const useHomeCatalog = () => {
  const refreshSeedRef = useRef(Date.now());
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
      shuffleProducts(
        [...allProducts].sort((left, right) => {
          const ratingDelta =
            Number(right?.rating || 0) - Number(left?.rating || 0);
          if (ratingDelta !== 0) return ratingDelta;

          const reviewDelta =
            Number(right?.reviews || 0) - Number(left?.reviews || 0);
          if (reviewDelta !== 0) return reviewDelta;

          return getTimestamp(right) - getTimestamp(left);
        }),
        refreshSeedRef.current + 17
      )
        .slice(0, 10),
    [allProducts]
  );

  const latestProducts = useMemo(
    () =>
      shuffleProducts(
        [...allProducts].sort(
          (left, right) => getTimestamp(right) - getTimestamp(left)
        ),
        refreshSeedRef.current + 71
      )
        .slice(0, 10),
    [allProducts]
  );

  return {
    categories,
    allProducts,
    featuredProducts,
    latestProducts,
    isLoading: Object.values(queryResults).some((result) => result.isLoading),
  };
};
