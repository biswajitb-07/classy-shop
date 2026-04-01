import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export const getImageFromQuery = (rawIndex, images = []) => {
  const normalizedImages = Array.isArray(images) ? images.filter(Boolean) : [];
  if (!normalizedImages.length) return "";

  const parsedIndex = Number(rawIndex);
  if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= normalizedImages.length) {
    return normalizedImages[0];
  }

  return normalizedImages[parsedIndex];
};

export const getValidatedQueryValue = (rawValue, allowedValues = []) => {
  if (rawValue === null || rawValue === undefined || rawValue === "") return "";

  const normalizedAllowedValues = new Set(
    (allowedValues || []).map((value) => String(value))
  );

  return normalizedAllowedValues.has(String(rawValue)) ? String(rawValue) : "";
};

export const parseQuantityMap = (rawValue, allowedKeys = []) => {
  const normalizedAllowedKeys = new Set((allowedKeys || []).map((key) => String(key)));
  const entries = String(rawValue || "")
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean);

  return entries.reduce((accumulator, entry) => {
    const [rawKey, rawQuantity] = entry.split(":");
    const key = String(rawKey || "").trim();
    const quantity = Number(rawQuantity);

    if (!normalizedAllowedKeys.has(key) || !Number.isInteger(quantity) || quantity <= 0) {
      return accumulator;
    }

    accumulator[key] = quantity;
    return accumulator;
  }, {});
};

export const serializeQuantityMap = (quantityMap = {}) =>
  Object.entries(quantityMap)
    .filter(([, quantity]) => Number.isInteger(Number(quantity)) && Number(quantity) > 0)
    .map(([key, quantity]) => `${key}:${Number(quantity)}`)
    .join(",");

export const useProductDetailQueryState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateQueryParams = useCallback(
    (updates = {}, options = {}) => {
      const nextSearchParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, String(value));
      });

      setSearchParams(nextSearchParams, { replace: true, ...options });
      return nextSearchParams;
    },
    [searchParams, setSearchParams]
  );

  return {
    searchParams,
    updateQueryParams,
  };
};
