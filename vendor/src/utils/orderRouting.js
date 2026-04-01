const ORDER_ID_REGEX = /([a-f0-9]{24})$/i;

export const slugifyOrderText = (value = "") =>
  String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const getOrderSlug = (order = {}) => {
  const primaryLabel = order.orderId || order._id || "order";
  return `${slugifyOrderText(primaryLabel)}-${order._id || order.orderId}`;
};

export const extractOrderIdFromSlug = (slug = "") =>
  String(slug || "").match(ORDER_ID_REGEX)?.[1] || "";

const buildOrderSearchParams = (search = "", query = {}) => {
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

export const getVendorOrderPath = (order = {}, options = {}) => {
  const params = buildOrderSearchParams(options.search, options.query);

  if (options.mode === "query") {
    params.set("orderId", order._id);
    params.set("slug", slugifyOrderText(order.orderId || "order"));
    const queryString = params.toString();
    return `/orders/details${queryString ? `?${queryString}` : ""}`;
  }

  const queryString = params.toString();
  return `/orders/details/${getOrderSlug(order)}${queryString ? `?${queryString}` : ""}`;
};

export const resolveVendorOrderIdFromRoute = ({
  routeOrderId = "",
  orderSlug = "",
  searchParams,
} = {}) =>
  String(searchParams?.get("orderId") || extractOrderIdFromSlug(orderSlug) || routeOrderId || "");
