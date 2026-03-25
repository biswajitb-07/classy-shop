import { useMemo } from "react";
import { useGetFashionItemsQuery } from "../../features/api/fashionApi.js";
import { useGetElectronicItemsQuery } from "../../features/api/electronicApi.js";
import { useGetBagItemsQuery } from "../../features/api/bagApi.js";
import { useGetBeautyItemsQuery } from "../../features/api/beautyApi.js";
import { useGetGroceryItemsQuery } from "../../features/api/groceryApi.js";
import { useGetJewelleryItemsQuery } from "../../features/api/jewelleryApi.js";
import { useGetFootwearItemsQuery } from "../../features/api/footwearApi.js";
import { useGetWellnessItemsQuery } from "../../features/api/wellnessApi.js";

const SOURCE_CONFIG = [
  {
    label: "Fashion",
    key: "fashionItems",
    routePrefix: "fashion",
    detailPath: "fashion-product-details",
    query: useGetFashionItemsQuery,
  },
  {
    label: "Electronics",
    key: "electronicItems",
    routePrefix: "electronics",
    detailPath: "electronics-product-details",
    query: useGetElectronicItemsQuery,
  },
  {
    label: "Bag",
    key: "bagItems",
    routePrefix: "bag",
    detailPath: "bag-product-details",
    query: useGetBagItemsQuery,
  },
  {
    label: "Beauty",
    key: "beautyItems",
    routePrefix: "beauty",
    detailPath: "beauty-product-details",
    query: useGetBeautyItemsQuery,
  },
  {
    label: "Grocery",
    key: "groceryItems",
    routePrefix: "grocery",
    detailPath: "grocery-product-details",
    query: useGetGroceryItemsQuery,
  },
  {
    label: "Jewellery",
    key: "jewelleryItems",
    routePrefix: "jewellery",
    detailPath: "jewellery-product-details",
    query: useGetJewelleryItemsQuery,
  },
  {
    label: "Footwear",
    key: "footwearItems",
    routePrefix: "footwear",
    detailPath: "footwear-product-details",
    query: useGetFootwearItemsQuery,
  },
  {
    label: "Wellness",
    key: "wellnessItems",
    routePrefix: "wellness",
    detailPath: "wellness-product-details",
    query: useGetWellnessItemsQuery,
  },
];

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const useMarketplaceSearch = (searchTerm = "") => {
  const fashion = useGetFashionItemsQuery();
  const electronics = useGetElectronicItemsQuery();
  const bags = useGetBagItemsQuery();
  const beauty = useGetBeautyItemsQuery();
  const grocery = useGetGroceryItemsQuery();
  const jewellery = useGetJewelleryItemsQuery();
  const footwear = useGetFootwearItemsQuery();
  const wellness = useGetWellnessItemsQuery();

  const sources = [
    {
      ...SOURCE_CONFIG[0],
      data: fashion.data?.fashionItems || [],
      isLoading: fashion.isLoading,
    },
    {
      ...SOURCE_CONFIG[1],
      data: electronics.data?.electronicItems || [],
      isLoading: electronics.isLoading,
    },
    {
      ...SOURCE_CONFIG[2],
      data: bags.data?.bagItems || [],
      isLoading: bags.isLoading,
    },
    {
      ...SOURCE_CONFIG[3],
      data: beauty.data?.beautyItems || [],
      isLoading: beauty.isLoading,
    },
    {
      ...SOURCE_CONFIG[4],
      data: grocery.data?.groceryItems || [],
      isLoading: grocery.isLoading,
    },
    {
      ...SOURCE_CONFIG[5],
      data: jewellery.data?.jewelleryItems || [],
      isLoading: jewellery.isLoading,
    },
    {
      ...SOURCE_CONFIG[6],
      data: footwear.data?.footwearItems || [],
      isLoading: footwear.isLoading,
    },
    {
      ...SOURCE_CONFIG[7],
      data: wellness.data?.wellnessItems || [],
      isLoading: wellness.isLoading,
    },
  ];

  const catalog = useMemo(() => {
    return sources.flatMap(({ label, routePrefix, detailPath, data }) =>
      data.map((product) => ({
        ...product,
        sourceLabel: label,
        routePrefix,
        detailPath,
        searchText: normalizeText(
          [
            product.name,
            product.category,
            product.productType,
            product.subCategory,
            product.thirdCategory,
            product.brand,
            product.description,
          ]
            .filter(Boolean)
            .join(" ")
        ),
      }))
    );
  }, [sources]);

  const matchedProducts = useMemo(() => {
    const term = normalizeText(searchTerm);
    if (!term) return catalog;
    return catalog.filter((product) => product.searchText.includes(term));
  }, [catalog, searchTerm]);

  const suggestionProducts = useMemo(() => {
    const term = normalizeText(searchTerm);
    if (!term) return catalog.slice(0, 6);
    return catalog
      .filter((product) => product.searchText.includes(term))
      .slice(0, 6);
  }, [catalog, searchTerm]);

  const isLoading = sources.some((source) => source.isLoading);

  const getProductPath = (product, searchTerm = "") => {
    const basePath = `/${product.routePrefix}/${product.detailPath}/${product._id}`;
    const term = normalizeText(searchTerm);
    if (!term) return basePath;
    return `${basePath}?from=search&q=${encodeURIComponent(searchTerm)}`;
  };

  return {
    catalog,
    matchedProducts,
    suggestionProducts,
    isLoading,
    getProductPath,
  };
};
