export const BUY_NOW_STORAGE_KEY = "classy_buy_now_checkout";

const isStorageAvailable = () => typeof window !== "undefined" && window.sessionStorage;

export const buildBuyNowVariant = (productType, options = {}) => {
  switch (productType) {
    case "Fashion":
    case "Footwear":
      return options.size ? `size:${options.size}` : "default";
    case "Electronics": {
      const entries = [
        options.ram ? `ram:${options.ram}` : "",
        options.storage ? `storage:${options.storage}` : "",
      ].filter(Boolean);
      return entries.length ? entries.sort().join("|") : "default";
    }
    default:
      return "default";
  }
};

export const buildBuyNowItem = ({
  product,
  productType,
  quantity = 1,
  size = "",
  ram = "",
  storage = "",
}) => ({
  productId: product?._id,
  productType,
  quantity,
  size: size || undefined,
  ram: ram || undefined,
  storage: storage || undefined,
  variant: buildBuyNowVariant(productType, { size, ram, storage }),
  price: Number(product?.discountedPrice || 0),
  productName: String(product?.name || "").trim(),
});

export const persistBuyNowCheckout = (items = []) => {
  if (!isStorageAvailable()) return;
  window.sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(items));
};

export const readBuyNowCheckout = () => {
  if (!isStorageAvailable()) return [];

  try {
    const rawValue = window.sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    if (!rawValue) return [];
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
};

export const clearBuyNowCheckout = () => {
  if (!isStorageAvailable()) return;
  window.sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
};
