import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PRODUCT_MAX_PRICE,
  createDefaultProductFilters,
  normalizeFilterToken,
} from "../utils/productFiltering.js";

const sortOptions = new Set([
  "recommended",
  "newest",
  "price_low_to_high",
  "price_high_to_low",
  "rating_high_to_low",
  "discount_high_to_low",
  "popular",
]);

const parseListParam = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

const normalizeForDisplay = (value) =>
  value
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();

const parsePositiveNumber = (value, fallbackValue) => {
  if (value === null || value === undefined || value === "") {
    return fallbackValue;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : fallbackValue;
};

const areSameNormalizedLists = (left = [], right = []) => {
  const normalizedLeft = [...left].map(normalizeFilterToken).sort();
  const normalizedRight = [...right].map(normalizeFilterToken).sort();

  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
};

const buildSearchParams = ({
  filters,
  page,
  defaultCategories,
  subcategory,
  thirdcategory,
}) => {
  const params = new URLSearchParams();
  const nextFilters = filters || createDefaultProductFilters();
  const categories = uniqueValues(nextFilters.categories || []);
  const brands = uniqueValues(nextFilters.brands || []);
  const ratings = uniqueValues((nextFilters.ratings || []).map(Number)).filter(
    (rating) => Number.isFinite(rating) && rating > 0,
  );
  const minPrice = parsePositiveNumber(nextFilters.minPrice, 0);
  const maxPrice = Math.min(
    PRODUCT_MAX_PRICE,
    parsePositiveNumber(nextFilters.maxPrice, PRODUCT_MAX_PRICE),
  );
  const minDiscount = parsePositiveNumber(nextFilters.minDiscount, 0);
  const currentPage = Math.max(1, parsePositiveNumber(page, 1));

  if (!areSameNormalizedLists(categories, defaultCategories)) {
    if (categories.length) {
      params.set("categories", categories.join(","));
    } else if (defaultCategories.length) {
      params.set("categories", "all");
    }
  }

  if (brands.length) params.set("brands", brands.join(","));
  if (minPrice > 0) params.set("minPrice", String(minPrice));
  if (maxPrice < PRODUCT_MAX_PRICE) params.set("maxPrice", String(maxPrice));
  if (ratings.length) params.set("ratings", ratings.join(","));
  if (sortOptions.has(nextFilters.sortBy) && nextFilters.sortBy !== "recommended") {
    params.set("sort", nextFilters.sortBy);
  }
  if (nextFilters.stockOnly) params.set("stock", "1");
  if (minDiscount > 0) params.set("discount", String(minDiscount));
  if (currentPage > 1) params.set("page", String(currentPage));
  if (subcategory) params.set("subcategory", subcategory);
  if (thirdcategory) params.set("thirdcategory", thirdcategory);

  return params;
};

export const useProductListingQueryState = ({ subcategory, thirdcategory }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const defaultCategories = useMemo(() => {
    const displaySub = normalizeForDisplay(subcategory);
    const displayThird = normalizeForDisplay(thirdcategory);

    return displayThird ? [displayThird] : displaySub ? [displaySub] : [];
  }, [subcategory, thirdcategory]);

  const appliedFilters = useMemo(() => {
    const defaultFilters = createDefaultProductFilters(defaultCategories);
    const categoryParam = searchParams.get("categories");
    const rawCategories =
      categoryParam === null
        ? defaultCategories
        : normalizeFilterToken(categoryParam) === "all"
          ? []
          : parseListParam(categoryParam);
    const minPrice = parsePositiveNumber(searchParams.get("minPrice"), 0);
    const maxPrice = Math.min(
      PRODUCT_MAX_PRICE,
      parsePositiveNumber(searchParams.get("maxPrice"), PRODUCT_MAX_PRICE),
    );

    return {
      ...defaultFilters,
      categories: rawCategories,
      brands: parseListParam(searchParams.get("brands")),
      minPrice: Math.min(minPrice, maxPrice),
      maxPrice: Math.max(minPrice, maxPrice),
      ratings: uniqueValues(parseListParam(searchParams.get("ratings")).map(Number)).filter(
        (rating) => Number.isFinite(rating) && rating > 0,
      ),
      sortBy: sortOptions.has(searchParams.get("sort"))
        ? searchParams.get("sort")
        : "recommended",
      stockOnly: ["1", "true", "yes", "in"].includes(
        normalizeFilterToken(searchParams.get("stock")),
      ),
      minDiscount: parsePositiveNumber(searchParams.get("discount"), 0),
    };
  }, [defaultCategories, searchParams]);

  const currentPage = useMemo(() => {
    const pageValue = Number(searchParams.get("page") || 1);
    return Number.isFinite(pageValue) && pageValue > 0 ? Math.floor(pageValue) : 1;
  }, [searchParams]);

  useEffect(() => {
    const querySubcategory = searchParams.get("subcategory") || "";
    const queryThirdcategory = searchParams.get("thirdcategory") || "";
    const nextSubcategory = subcategory || "";
    const nextThirdcategory = thirdcategory || "";

    if (
      querySubcategory === nextSubcategory &&
      queryThirdcategory === nextThirdcategory
    ) {
      return;
    }

    setSearchParams(
      buildSearchParams({
        filters: appliedFilters,
        page: currentPage,
        defaultCategories,
        subcategory: nextSubcategory,
        thirdcategory: nextThirdcategory,
      }),
      { replace: true },
    );
  }, [
    appliedFilters,
    currentPage,
    defaultCategories,
    searchParams,
    setSearchParams,
    subcategory,
    thirdcategory,
  ]);

  const updateListingState = useCallback(
    (filters, page = 1) => {
      setSearchParams(
        buildSearchParams({
          filters,
          page,
          defaultCategories,
          subcategory,
          thirdcategory,
        }),
      );
    },
    [defaultCategories, setSearchParams, subcategory, thirdcategory],
  );

  const setListingFilters = useCallback(
    (filters) => {
      updateListingState(filters, 1);
    },
    [updateListingState],
  );

  const clearListingFilters = useCallback(() => {
    updateListingState(createDefaultProductFilters(defaultCategories), 1);
  }, [defaultCategories, updateListingState]);

  const setListingPage = useCallback(
    (page) => {
      updateListingState(appliedFilters, page);
    },
    [appliedFilters, updateListingState],
  );

  return {
    normalizeForDisplay,
    defaultCategories,
    appliedFilters,
    currentPage,
    setListingFilters,
    clearListingFilters,
    setListingPage,
  };
};
