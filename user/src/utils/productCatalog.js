export const PRODUCT_TYPE_CONFIG = {
  Fashion: {
    label: "Fashion",
    routeSegment: "fashion",
  },
  Electronics: {
    label: "Electronics",
    routeSegment: "electronics",
  },
  Bag: {
    label: "Bags",
    routeSegment: "bag",
  },
  Footwear: {
    label: "Footwear",
    routeSegment: "footwear",
  },
  Grocery: {
    label: "Groceries",
    routeSegment: "grocery",
  },
  Beauty: {
    label: "Beauty",
    routeSegment: "beauty",
  },
  Wellness: {
    label: "Wellness",
    routeSegment: "wellness",
  },
  Jewellery: {
    label: "Jewellery",
    routeSegment: "jewellery",
  },
};

export const normalizeProductType = (value = "") => {
  const normalized = String(value).trim().toLowerCase();

  if (normalized === "fashion") return "Fashion";
  if (normalized === "electronics" || normalized === "electronic") {
    return "Electronics";
  }
  if (normalized === "bag" || normalized === "bags") return "Bag";
  if (normalized === "footwear") return "Footwear";
  if (normalized === "grocery" || normalized === "groceries") return "Grocery";
  if (normalized === "beauty") return "Beauty";
  if (normalized === "wellness") return "Wellness";
  if (normalized === "jewellery" || normalized === "jewelry") {
    return "Jewellery";
  }

  return value;
};

export const getProductType = (product = {}) =>
  normalizeProductType(
    product.productType || product.category || product.sourceLabel || ""
  );

export const getProductCategoryLabel = (product = {}) => {
  const productType = getProductType(product);
  return PRODUCT_TYPE_CONFIG[productType]?.label || productType;
};

export const getProductRouteSegment = (product = {}) => {
  const productType = getProductType(product);
  return PRODUCT_TYPE_CONFIG[productType]?.routeSegment || productType.toLowerCase();
};

export const getProductDetailPath = (product = {}) => {
  const routeSegment = getProductRouteSegment(product);
  return `/${routeSegment}/${routeSegment}-product-details/${product._id}`;
};

export const normalizeHomeProduct = (product = {}, fallbackType = "") => {
  const productType = normalizeProductType(
    product.productType || product.category || fallbackType
  );

  return {
    ...product,
    productType,
    category: productType,
    categoryLabel: PRODUCT_TYPE_CONFIG[productType]?.label || productType,
  };
};
