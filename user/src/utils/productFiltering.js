export const PRODUCT_MAX_PRICE = 60000;

export const normalizeFilterToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[-\s&]/g, "")
    .trim();

export const createDefaultProductFilters = (categories = []) => ({
  categories,
  brands: [],
  minPrice: 0,
  maxPrice: PRODUCT_MAX_PRICE,
  ratings: [],
  sortBy: "recommended",
  stockOnly: false,
  minDiscount: 0,
});

export const getProductDiscountPercent = (product) => {
  const originalPrice = Number(product?.originalPrice || 0);
  const discountedPrice = Number(
    product?.discountedPrice ?? product?.originalPrice ?? 0,
  );

  if (!originalPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

const getComparablePrice = (product) =>
  Number(product?.discountedPrice ?? product?.originalPrice ?? 0);

export const filterAndSortProducts = (products = [], filters = {}) => {
  const normalizedCategories = (filters.categories || []).map(normalizeFilterToken);
  const normalizedBrands = (filters.brands || []).map(normalizeFilterToken);

  const filtered = products.filter((product) => {
    const price = getComparablePrice(product);
    const subCategory = product?.subCategory || "";
    const thirdCategory = product?.thirdLevelCategory || "";
    const brand = product?.brand || "";
    const rating = Number(product?.rating || 0);
    const discountPercent = getProductDiscountPercent(product);
    const inStock = Number(product?.inStock || 0) > 0;

    const matchesCategory =
      normalizedCategories.length === 0 ||
      normalizedCategories.some(
        (filter) =>
          normalizeFilterToken(subCategory) === filter ||
          normalizeFilterToken(thirdCategory) === filter,
      );

    const matchesBrand =
      normalizedBrands.length === 0 ||
      normalizedBrands.includes(normalizeFilterToken(brand));

    const matchesRating =
      (filters.ratings || []).length === 0 ||
      filters.ratings.some((minimum) => rating >= minimum);

    return (
      matchesCategory &&
      matchesBrand &&
      price >= Number(filters.minPrice || 0) &&
      price <= Number(filters.maxPrice ?? PRODUCT_MAX_PRICE) &&
      matchesRating &&
      (!filters.stockOnly || inStock) &&
      discountPercent >= Number(filters.minDiscount || 0)
    );
  });

  return [...filtered].sort((left, right) => {
    const leftPrice = getComparablePrice(left);
    const rightPrice = getComparablePrice(right);
    const leftRating = Number(left?.rating || 0);
    const rightRating = Number(right?.rating || 0);
    const leftDiscount = getProductDiscountPercent(left);
    const rightDiscount = getProductDiscountPercent(right);
    const leftReviews = Number(left?.reviews || 0);
    const rightReviews = Number(right?.reviews || 0);
    const leftStock = Number(left?.inStock || 0);
    const rightStock = Number(right?.inStock || 0);
    const leftCreatedAt = new Date(left?.createdAt || 0).getTime();
    const rightCreatedAt = new Date(right?.createdAt || 0).getTime();

    switch (filters.sortBy) {
      case "newest":
        return rightCreatedAt - leftCreatedAt;
      case "price_low_to_high":
        return leftPrice - rightPrice;
      case "price_high_to_low":
        return rightPrice - leftPrice;
      case "rating_high_to_low":
        return rightRating - leftRating || rightReviews - leftReviews;
      case "discount_high_to_low":
        return rightDiscount - leftDiscount || leftPrice - rightPrice;
      case "popular":
        return rightReviews - leftReviews || rightRating - leftRating;
      case "recommended":
      default:
        return (
          rightRating - leftRating ||
          rightDiscount - leftDiscount ||
          rightReviews - leftReviews ||
          rightStock - leftStock ||
          rightCreatedAt - leftCreatedAt
        );
    }
  });
};

export const getAvailableBrands = (products = []) =>
  [...new Set(products.map((product) => product?.brand).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right),
  );
