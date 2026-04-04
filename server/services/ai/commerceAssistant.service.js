import Bag from "../../models/vendor/bag/bag.model.js";
import Beauty from "../../models/vendor/beauty/beauty.model.js";
import Electronic from "../../models/vendor/electronic/electronic.model.js";
import Fashion from "../../models/vendor/fashion/fashion.model.js";
import Footwear from "../../models/vendor/footwear/footwear.model.js";
import Grocery from "../../models/vendor/grocery/grocery.model.js";
import Jewellery from "../../models/vendor/jewellery/jewellery.model.js";
import Wellness from "../../models/vendor/wellness/wellness.model.js";

const PRODUCT_SOURCES = [
  { label: "Fashion", routePrefix: "fashion", model: Fashion },
  { label: "Electronics", routePrefix: "electronics", model: Electronic },
  { label: "Bag", routePrefix: "bag", model: Bag },
  { label: "Beauty", routePrefix: "beauty", model: Beauty },
  { label: "Grocery", routePrefix: "grocery", model: Grocery },
  { label: "Jewellery", routePrefix: "jewellery", model: Jewellery },
  { label: "Footwear", routePrefix: "footwear", model: Footwear },
  { label: "Wellness", routePrefix: "wellness", model: Wellness },
];

const CATEGORY_ALIASES = [
  { category: "Fashion", terms: ["fashion", "shirt", "shirts", "dress", "kurta", "jeans", "clothes", "clothing"] },
  { category: "Electronics", terms: ["electronics", "electronic", "phone", "mobile", "laptop", "earbuds", "watch", "tablet"] },
  { category: "Bag", terms: ["bag", "bags", "backpack", "wallet", "handbag", "luggage"] },
  { category: "Beauty", terms: ["beauty", "skincare", "makeup", "serum", "cream", "lipstick"] },
  { category: "Grocery", terms: ["grocery", "groceries", "rice", "atta", "oil", "snacks", "food"] },
  { category: "Jewellery", terms: ["jewellery", "jewelry", "ring", "earring", "necklace", "bracelet"] },
  { category: "Footwear", terms: ["footwear", "shoes", "sneakers", "sandals", "heels", "slippers"] },
  { category: "Wellness", terms: ["wellness", "health", "supplement", "protein", "vitamin", "care"] },
];

const SUPPORT_CATEGORY_RULES = [
  {
    category: "order_issue",
    priority: "high",
    terms: ["order", "cancel", "wrong item", "missing item", "not received", "order issue", "order stuck"],
    summary: "Customer ko order related help chahiye.",
    suggestedAction: "Order timeline, item details, aur current fulfillment status verify karo.",
  },
  {
    category: "payment",
    priority: "high",
    terms: ["payment", "charged", "refund", "upi", "razorpay", "wallet", "failed payment"],
    summary: "Payment ya refund concern detect hua hai.",
    suggestedAction: "Payment transaction status aur refund trail check karo.",
  },
  {
    category: "delivery",
    priority: "medium",
    terms: ["delivery", "shipped", "late", "courier", "tracking", "otp", "delivered"],
    summary: "Delivery ya tracking se related help chahiye.",
    suggestedAction: "Tracking status, assigned partner, aur latest location update verify karo.",
  },
  {
    category: "return_refund",
    priority: "medium",
    terms: ["return", "replace", "refund", "pickup", "defective", "damaged"],
    summary: "Return ya refund support ka request hai.",
    suggestedAction: "Return eligibility aur last order status check karke clear response do.",
  },
  {
    category: "account_access",
    priority: "medium",
    terms: ["login", "signup", "account", "password", "otp", "blocked", "profile"],
    summary: "Account access ya login issue lag raha hai.",
    suggestedAction: "Auth status, reset flow, aur account flags verify karo.",
  },
  {
    category: "product_help",
    priority: "low",
    terms: ["product", "size", "brand", "description", "stock", "available", "details"],
    summary: "Product info ya buying help chahiye.",
    suggestedAction: "Product details, variants, aur stock state confirm karo.",
  },
  {
    category: "business_support",
    priority: "medium",
    terms: ["payout", "dashboard", "policy", "commission", "vendor", "settlement", "report"],
    summary: "Business ya dashboard support request detect hui hai.",
    suggestedAction: "Payout, dashboard metrics, ya admin policy context ke saath respond karo.",
  },
  {
    category: "technical",
    priority: "medium",
    terms: ["bug", "error", "issue", "broken", "not working", "problem", "crash"],
    summary: "General technical issue report hua hai.",
    suggestedAction: "Exact steps, screenshot, aur impacted area capture karke troubleshoot karo.",
  },
];

const POSITIVE_REVIEW_TERMS = [
  "good",
  "great",
  "excellent",
  "amazing",
  "awesome",
  "best",
  "comfortable",
  "perfect",
  "value",
  "worth",
  "nice",
  "premium",
  "fast",
  "beautiful",
  "quality",
];

const NEGATIVE_REVIEW_TERMS = [
  "bad",
  "poor",
  "worst",
  "late",
  "damaged",
  "broken",
  "disappointed",
  "small",
  "large",
  "issue",
  "problem",
  "cheap",
  "refund",
  "return",
  "slow",
];

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.,/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token && token.length > 1);

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? `Rs ${Number(value).toLocaleString("en-IN")}` : "";

const extractBudgetHint = (query) => {
  const normalized = normalizeText(query);
  const underMatch = normalized.match(/under\s+(\d{2,6})/);
  if (underMatch) {
    return {
      type: "under",
      value: Number(underMatch[1]),
      label: `under ${formatCurrency(underMatch[1])}`,
    };
  }

  const aroundMatch = normalized.match(/(?:around|near|approx)\s+(\d{2,6})/);
  if (aroundMatch) {
    return {
      type: "around",
      value: Number(aroundMatch[1]),
      label: `around ${formatCurrency(aroundMatch[1])}`,
    };
  }

  const betweenMatch = normalized.match(/between\s+(\d{2,6})\s+(?:and|to)\s+(\d{2,6})/);
  if (betweenMatch) {
    const min = Number(betweenMatch[1]);
    const max = Number(betweenMatch[2]);
    return {
      type: "between",
      value: max,
      min,
      max,
      label: `between ${formatCurrency(min)} and ${formatCurrency(max)}`,
    };
  }

  return null;
};

const detectCategory = (query) => {
  const normalized = normalizeText(query);
  const match = CATEGORY_ALIASES.find(({ terms }) =>
    terms.some((term) => normalized.includes(term))
  );
  return match?.category || "";
};

const toSearchableProduct = (product, source) => {
  const salePrice = Number(
    product.discountedPrice ?? product.salePrice ?? product.price ?? product.originalPrice ?? 0
  );
  const originalPrice = Number(product.originalPrice ?? product.price ?? salePrice);
  const rating = Number(product.rating || 0);
  const reviews = Number(product.reviews || 0);

  return {
    _id: String(product._id),
    name: product.name || "Untitled product",
    brand: product.brand || "",
    description: product.description || "",
    category: product.category || source.label,
    subCategory: product.subCategory || "",
    thirdCategory: product.thirdLevelCategory || product.thirdCategory || "",
    sourceLabel: source.label,
    routePrefix: source.routePrefix,
    image: product.image || [],
    salePrice,
    originalPrice,
    rating,
    reviews,
    inStock: Number(product.inStock || 0),
    searchText: normalizeText(
      [
        product.name,
        product.brand,
        product.category,
        product.subCategory,
        product.thirdLevelCategory,
        product.description,
        source.label,
      ]
        .filter(Boolean)
        .join(" ")
    ),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

const scoreProductForQuery = (product, query, options = {}) => {
  const tokens = tokenize(query);
  const normalized = normalizeText(query);
  const budgetHint = options.budgetHint || extractBudgetHint(query);
  const detectedCategory = options.detectedCategory || detectCategory(query);

  let score = 0;

  tokens.forEach((token) => {
    if (product.name.toLowerCase().includes(token)) score += 22;
    if (product.brand.toLowerCase().includes(token)) score += 12;
    if (product.category.toLowerCase().includes(token)) score += 10;
    if (product.subCategory.toLowerCase().includes(token)) score += 8;
    if (product.thirdCategory.toLowerCase().includes(token)) score += 8;
    if (product.description.toLowerCase().includes(token)) score += 3;
  });

  if (detectedCategory && normalizeText(product.sourceLabel) === normalizeText(detectedCategory)) {
    score += 20;
  }

  if (normalized.includes("latest") || normalized.includes("new")) {
    const freshnessScore = Math.max(
      0,
      20 - Math.floor((Date.now() - new Date(product.updatedAt || product.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24))
    );
    score += freshnessScore;
  }

  if (normalized.includes("top rated") || normalized.includes("best") || normalized.includes("featured")) {
    score += product.rating * 6 + Math.min(12, product.reviews);
  }

  if (budgetHint && product.salePrice > 0) {
    if (budgetHint.type === "between") {
      if (product.salePrice >= budgetHint.min && product.salePrice <= budgetHint.max) {
        score += 18;
      } else {
        score -= 8;
      }
    } else if (budgetHint.type === "under") {
      if (product.salePrice <= budgetHint.value) {
        score += 16;
      } else {
        score -= Math.min(14, Math.ceil((product.salePrice - budgetHint.value) / 500));
      }
    } else if (budgetHint.type === "around") {
      const diff = Math.abs(product.salePrice - budgetHint.value);
      score += Math.max(0, 14 - Math.floor(diff / 500));
    }
  }

  if (product.inStock > 0) score += 6;
  if (product.salePrice > 0 && product.originalPrice > product.salePrice) {
    score += Math.min(10, Math.round(((product.originalPrice - product.salePrice) / product.originalPrice) * 20));
  }

  score += Math.min(15, Math.round(product.rating * 2));
  score += Math.min(8, Math.log10(product.reviews + 1) * 4);

  return score;
};

export const getAiPoweredProductSearch = async ({ query, limit = 8 }) => {
  const searchQuery = String(query || "").trim();
  if (!searchQuery) {
    return {
      query: "",
      explanation: "Type something like black bag under 2000 or top rated skincare.",
      detectedCategory: "",
      budgetHint: null,
      products: [],
    };
  }

  const catalogBatches = await Promise.all(
    PRODUCT_SOURCES.map(async (source) => {
      const products = await source.model
        .find({})
        .select("name brand description category subCategory thirdLevelCategory image originalPrice discountedPrice salePrice price rating reviews inStock createdAt updatedAt")
        .lean();

      return products.map((product) => toSearchableProduct(product, source));
    })
  );

  const catalog = catalogBatches.flat();
  const detectedCategory = detectCategory(searchQuery);
  const budgetHint = extractBudgetHint(searchQuery);

  const ranked = catalog
    .map((product) => ({
      ...product,
      aiScore: scoreProductForQuery(product, searchQuery, { detectedCategory, budgetHint }),
    }))
    .filter((product) => product.aiScore > 0 || product.searchText.includes(normalizeText(searchQuery)) || !detectedCategory)
    .sort((left, right) => {
      if (right.aiScore !== left.aiScore) return right.aiScore - left.aiScore;
      if (right.rating !== left.rating) return right.rating - left.rating;
      return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
    })
    .slice(0, limit);

  const explanationParts = [];
  if (detectedCategory) explanationParts.push(`${detectedCategory} category detect hui`);
  if (budgetHint?.label) explanationParts.push(`budget ${budgetHint.label}`);
  if (!explanationParts.length) explanationParts.push("name, brand, description, rating aur price ke base par smart ranking hua");

  return {
    query: searchQuery,
    explanation: explanationParts.join(", "),
    detectedCategory,
    budgetHint,
    products: ranked,
  };
};

export const generateVendorProductDescription = (input = {}) => {
  const name = String(input.name || "").trim();
  const brand = String(input.brand || "").trim();
  const category = String(input.category || "").trim();
  const subCategory = String(input.subCategory || "").trim();
  const thirdLevelCategory = String(input.thirdLevelCategory || input.thirdCategory || "").trim();
  const originalPrice = String(input.originalPrice || "").trim();
  const discountedPrice = String(input.discountedPrice || "").trim();
  const inStock = String(input.inStock || "").trim();

  const identityParts = [brand, name].filter(Boolean);
  const categoryParts = [category, subCategory, thirdLevelCategory].filter(Boolean);
  const pricePart =
    discountedPrice || originalPrice
      ? `Price point ${formatCurrency(discountedPrice || originalPrice)}`
      : "";
  const stockPart = inStock ? `Current stock available: ${inStock}` : "";

  const highlights = [
    categoryParts.length ? `${categoryParts.join(" / ")} category positioning` : "",
    brand ? `${brand} brand identity ko highlight karta copy` : "",
    discountedPrice
      ? `Discounted offer angle ke saath conversion-friendly language`
      : "Clean everyday value proposition",
    stockPart,
  ].filter(Boolean);

  const shortDescription = [
    identityParts.join(" "),
    categoryParts.length ? `is a standout choice in ${categoryParts.join(" / ")}.` : "is designed for shoppers looking for reliable quality.",
    discountedPrice
      ? `It delivers strong value at ${formatCurrency(discountedPrice)}.`
      : pricePart ? `${pricePart}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const longDescription = [
    identityParts.length ? `${identityParts.join(" ")} gives your catalog a polished, shopper-friendly presence.` : "This product is crafted to stand out in your catalog.",
    categoryParts.length
      ? `It sits confidently inside the ${categoryParts.join(" / ")} segment and can appeal to customers searching for a dependable option in this category.`
      : "It is positioned as a versatile option for customers browsing this category.",
    brand
      ? `The copy keeps ${brand} visible so brand recall stays strong during discovery and checkout.`
      : "The description stays brand-neutral and focused on clear customer value.",
    discountedPrice
      ? `With a live selling price of ${formatCurrency(discountedPrice)}${originalPrice ? ` against an original price of ${formatCurrency(originalPrice)}` : ""}, it also supports promotional messaging without sounding pushy.`
      : pricePart ? `${pricePart}.` : "",
    inStock ? `Available inventory currently stands at ${inStock}, so the listing can confidently communicate readiness to fulfill incoming orders.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    headline: `${name || "Product"} description ready`,
    shortDescription,
    longDescription,
    bulletHighlights: highlights,
  };
};

export const classifySupportTicket = ({ message = "", messages = [], scope = "user" } = {}) => {
  const joinedText = normalizeText(
    [message, ...(Array.isArray(messages) ? messages.slice(-4).map((item) => item?.text || item?.message || "") : [])].join(" ")
  );

  const matchedRule = SUPPORT_CATEGORY_RULES.find((rule) =>
    rule.terms.some((term) => joinedText.includes(normalizeText(term)))
  );

  const fallbackSummary =
    scope === "vendor"
      ? "Vendor-side business ya admin support request detect hui."
      : "General customer support request detect hui.";

  const category = matchedRule?.category || (scope === "vendor" ? "business_support" : "general_support");
  const priority = matchedRule?.priority || "medium";

  return {
    category,
    priority,
    label: category
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    summary: matchedRule?.summary || fallbackSummary,
    suggestedAction:
      matchedRule?.suggestedAction ||
      "Latest message context read karke concise, action-oriented reply do.",
    confidence: matchedRule ? 0.88 : 0.52,
  };
};

export const summarizeProductReviews = ({ productName = "", reviews = [], averageRating = 0, totalReviews = 0 }) => {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      headline: "No review summary yet",
      sentiment: "neutral",
      shortSummary: "Abhi tak enough customer feedback available nahi hai.",
      positives: [],
      concerns: [],
    };
  }

  const comments = reviews.map((review) => String(review.comment || "").trim()).filter(Boolean);
  const normalizedComments = comments.map(normalizeText);

  const positiveMentions = POSITIVE_REVIEW_TERMS.filter((term) =>
    normalizedComments.some((comment) => comment.includes(term))
  );
  const negativeMentions = NEGATIVE_REVIEW_TERMS.filter((term) =>
    normalizedComments.some((comment) => comment.includes(term))
  );

  const sentiment =
    Number(averageRating || 0) >= 4.2
      ? "positive"
      : Number(averageRating || 0) >= 3.2
        ? "mixed"
        : "critical";

  const positives = positiveMentions.slice(0, 3).map((term) => `${term} feedback baar-baar mention hua`);
  const concerns = negativeMentions.slice(0, 3).map((term) => `${term} concern kuch reviews me aaya`);

  const shortSummary =
    sentiment === "positive"
      ? `${productName || "This product"} ko customers generally strong rating de rahe hain, especially quality aur value perception ke around.`
      : sentiment === "mixed"
        ? `${productName || "This product"} par feedback mixed hai; customers ko kuch areas pasand aa rahe hain, lekin consistency par thoda concern bhi hai.`
        : `${productName || "This product"} par customer feedback weak side par hai aur improvement points clearly visible hain.`;

  return {
    headline: `${Number(averageRating || 0).toFixed(1)} / 5 from ${Number(totalReviews || reviews.length)} reviews`,
    sentiment,
    shortSummary,
    positives,
    concerns,
  };
};
