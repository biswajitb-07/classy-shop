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

const OBJECT_ID_REGEX = /([a-f0-9]{24})$/i;

export const slugifyProductText = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

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
    product.productType ||
      product.category ||
      product.sourceLabel ||
      product.routePrefix ||
      ""
  );

export const getProductCategoryLabel = (product = {}) => {
  const productType = getProductType(product);
  return PRODUCT_TYPE_CONFIG[productType]?.label || productType;
};

export const getProductRouteSegment = (product = {}) => {
  if (product.routePrefix) {
    return String(product.routePrefix).toLowerCase();
  }

  const productType = getProductType(product);
  return PRODUCT_TYPE_CONFIG[productType]?.routeSegment || productType.toLowerCase();
};

export const getProductSlug = (product = {}) => {
  const nameSlug = slugifyProductText(product.name || product.title || "product");
  return `${nameSlug}-${product._id}`;
};

export const extractProductIdFromSlug = (slug = "") =>
  String(slug || "").match(OBJECT_ID_REGEX)?.[1] || "";

const buildProductSearchParams = (search = "", query = {}) => {
  const params =
    search instanceof URLSearchParams
      ? new URLSearchParams(search)
      : new URLSearchParams(search || "");

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      return;
    }

    params.set(key, String(value));
  });

  return params;
};

export const getProductDetailPath = (product = {}, options = {}) => {
  const routeSegment = options.routeSegment || getProductRouteSegment(product);
  const params = buildProductSearchParams(options.search, options.query);

  if (options.mode === "query") {
    params.set("productId", product._id);
    params.set("slug", slugifyProductText(product.name || product.title || "product"));
    const queryString = params.toString();
    return `/${routeSegment}/product-details${queryString ? `?${queryString}` : ""}`;
  }

  const queryString = params.toString();
  return `/${routeSegment}/details/${getProductSlug(product)}${queryString ? `?${queryString}` : ""}`;
};

export const resolveProductIdFromRoute = ({
  routeProductId = "",
  productSlug = "",
  searchParams,
} = {}) =>
  String(
    searchParams?.get("productId") ||
      searchParams?.get("id") ||
      extractProductIdFromSlug(productSlug) ||
      routeProductId ||
      ""
  );

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
