import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

const parsePositiveNumber = (value, fallbackValue = 1) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallbackValue;
};

export const getVendorListingQueryState = (
  searchParams,
  { hasBrandTab = false } = {},
) => ({
  tab: hasBrandTab ? searchParams.get("brand") || "all" : "all",
  q: searchParams.get("q") || "",
  category: searchParams.get("category") || "all",
  subCategory: searchParams.get("subCategory") || "all",
  thirdLevel: searchParams.get("thirdLevel") || "all",
  page: parsePositiveNumber(searchParams.get("page"), 1),
});

export const useVendorListingQueryState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateQueryParams = useCallback(
    (updates = {}, options = {}) => {
      const nextSearchParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === "all") {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, String(value));
      });

      const currentQueryString = searchParams.toString();
      const nextQueryString = nextSearchParams.toString();

      if (currentQueryString === nextQueryString) {
        return nextSearchParams;
      }

      setSearchParams(nextSearchParams, { replace: true, ...options });
      return nextSearchParams;
    },
    [searchParams, setSearchParams],
  );

  return {
    searchParams,
    updateQueryParams,
  };
};
