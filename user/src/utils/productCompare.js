const STORAGE_KEY = "classyshop_compare_products";
const MAX_COMPARE_ITEMS = 4;

const safeWindow = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined"
    ? window
    : null;

const normalizeList = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";

export const getCompareProducts = () => {
  const browserWindow = safeWindow();
  if (!browserWindow) return [];

  try {
    const raw = browserWindow.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to read compare products", error);
    return [];
  }
};

export const saveCompareProducts = (products) => {
  const browserWindow = safeWindow();
  if (!browserWindow) return;

  browserWindow.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  browserWindow.dispatchEvent(new Event("compare-products:updated"));
};

export const isProductCompared = (productId, productType) =>
  getCompareProducts().some(
    (item) =>
      String(item?._id) === String(productId) && item?.productType === productType,
  );

export const buildCompareProduct = (product, productType, productUrl) => ({
  _id: product?._id,
  productType,
  productUrl,
  name: product?.name || "Unnamed product",
  brand: product?.brand || "ClassyShop",
  rating: Number(product?.rating || 0),
  reviews: Number(product?.reviews || 0),
  discountedPrice: Number(product?.discountedPrice || 0),
  originalPrice: Number(product?.originalPrice || 0),
  inStock: product?.inStock ?? 0,
  subCategory: product?.subCategory || "General",
  thirdCategory:
    product?.thirdCategory || product?.thirdLevelCategory || "General",
  shippingInfo: product?.shippingInfo || "Standard shipping available",
  image: Array.isArray(product?.image) ? product.image[0] : product?.image || "",
  sizes: normalizeList(product?.sizes),
  ram: normalizeList(product?.rams || product?.ram),
  storage: normalizeList(product?.storage),
  description:
    product?.description || "Compare this product with other shortlisted picks.",
});

export const toggleCompareProduct = (product) => {
  const current = getCompareProducts();
  const exists = current.some(
    (item) =>
      String(item?._id) === String(product?._id) &&
      item?.productType === product?.productType,
  );

  if (exists) {
    const next = current.filter(
      (item) =>
        !(
          String(item?._id) === String(product?._id) &&
          item?.productType === product?.productType
        ),
    );
    saveCompareProducts(next);
    return { compared: false, products: next };
  }

  if (current.length >= MAX_COMPARE_ITEMS) {
    return {
      compared: false,
      limitReached: true,
      products: current,
    };
  }

  const next = [...current, product];
  saveCompareProducts(next);
  return { compared: true, products: next };
};

export const removeCompareProduct = (productId, productType) => {
  const next = getCompareProducts().filter(
    (item) =>
      !(
        String(item?._id) === String(productId) &&
        item?.productType === productType
      ),
  );
  saveCompareProducts(next);
  return next;
};

export const clearCompareProducts = () => {
  saveCompareProducts([]);
};
