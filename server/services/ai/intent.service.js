const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasWholeTerm = (text, term) =>
  new RegExp(
    `(^|[^a-z0-9])${String(term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
  ).test(text);

const containsAnyWholeTerm = (text, terms = []) =>
  terms.some((term) => hasWholeTerm(text, term));

const ORDER_TERMS = [
  "order",
  "orders",
  "track",
  "tracking",
  "cancel",
  "return",
  "refund",
];

const ACCOUNT_TERMS = ["profile", "wishlist", "cart", "my account", "latest order"];

const NAVIGATION_TERMS = [
  "theme",
  "settings",
  "dark mode",
  "light mode",
  "night mode",
  "how to",
  "kaise",
  "where",
  "navigate",
  "terms",
  "policy",
  "payment",
  "delivery",
  "support",
];

const SHOPPING_TERMS = [
  "product",
  "products",
  "buy",
  "show",
  "suggest",
  "recommend",
  "dikhao",
  "discount",
  "price",
  "rating",
  "brand",
];

export const classifyAiIntent = ({ message, filters = {} }) => {
  const normalizedMessage = normalize(message);

  const hasShoppingSignal =
    containsAnyWholeTerm(normalizedMessage, SHOPPING_TERMS) ||
    Boolean(
      filters.category ||
        filters.minPrice !== null ||
        filters.maxPrice !== null ||
        filters.minDiscount !== null ||
        filters.exactDiscount !== null ||
        filters.maxDiscount !== null ||
        filters.minRating !== null ||
        filters.exactRating !== null ||
        filters.maxRating !== null,
    );
  const hasNavigationSignal = containsAnyWholeTerm(normalizedMessage, NAVIGATION_TERMS);
  const hasOrderSignal = containsAnyWholeTerm(normalizedMessage, ORDER_TERMS);
  const hasAccountSignal = containsAnyWholeTerm(normalizedMessage, ACCOUNT_TERMS);

  const activeIntents = [
    hasShoppingSignal ? "shopping" : null,
    hasNavigationSignal ? "navigation" : null,
    hasOrderSignal ? "order" : null,
    hasAccountSignal ? "account" : null,
  ].filter(Boolean);

  if (activeIntents.length > 1) {
    return {
      intent: "mixed",
      confidence: 0.64,
    };
  }

  if (hasOrderSignal) {
    return { intent: "order", confidence: 0.9 };
  }

  if (hasAccountSignal) {
    return { intent: "account", confidence: 0.88 };
  }

  if (hasNavigationSignal) {
    return { intent: "navigation", confidence: 0.85 };
  }

  if (hasShoppingSignal) {
    return { intent: "shopping", confidence: 0.82 };
  }

  return {
    intent: "mixed",
    confidence: 0.35,
  };
};
