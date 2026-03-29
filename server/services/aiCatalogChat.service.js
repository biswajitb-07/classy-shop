import Bag from "../models/vendor/bag/bag.model.js";
import Beauty from "../models/vendor/beauty/beauty.model.js";
import Electronic from "../models/vendor/electronic/electronic.model.js";
import Fashion from "../models/vendor/fashion/fashion.model.js";
import Footwear from "../models/vendor/footwear/footwear.model.js";
import Grocery from "../models/vendor/grocery/grocery.model.js";
import Jewellery from "../models/vendor/jewellery/jewellery.model.js";
import { Cart } from "../models/user/cart.model.js";
import Order from "../models/user/order.model.js";
import { User } from "../models/user/user.model.js";
import Wellness from "../models/vendor/wellness/wellness.model.js";
import { Wishlist } from "../models/user/wishlist.model.js";
import { companyPages } from "../../user/src/utils/siteSupport.js";

const DEFAULT_AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const PRODUCT_SOURCES = [
  {
    label: "Fashion",
    routePrefix: "fashion",
    detailPath: "fashion-product-details",
    model: Fashion,
  },
  {
    label: "Electronics",
    routePrefix: "electronics",
    detailPath: "electronics-product-details",
    model: Electronic,
  },
  {
    label: "Bag",
    routePrefix: "bag",
    detailPath: "bag-product-details",
    model: Bag,
  },
  {
    label: "Beauty",
    routePrefix: "beauty",
    detailPath: "beauty-product-details",
    model: Beauty,
  },
  {
    label: "Grocery",
    routePrefix: "grocery",
    detailPath: "grocery-product-details",
    model: Grocery,
  },
  {
    label: "Jewellery",
    routePrefix: "jewellery",
    detailPath: "jewellery-product-details",
    model: Jewellery,
  },
  {
    label: "Footwear",
    routePrefix: "footwear",
    detailPath: "footwear-product-details",
    model: Footwear,
  },
  {
    label: "Wellness",
    routePrefix: "wellness",
    detailPath: "wellness-product-details",
    model: Wellness,
  },
];

const SYSTEM_PROMPT = `You are an intelligent AI assistant for Classy Store, a full-featured ecommerce platform.

Your role is not limited to product recommendations. You must act like a complete website assistant who can help with:
- products, categories, offers, and discounts
- orders, profile, cart, and wishlist guidance
- website navigation, settings, theme change, and support
- policies and platform information

Language rules:
- Reply naturally in Hinglish, English, or Hindi depending on the user's style.
- Keep the response clear, short, helpful, and professional.
- If the user asks about something not available on this website, politely say it is not available instead of inventing it.

Grounding rules:
- Use only the grounded context provided in this request.
- Grounded context can include conversation history, catalog candidates, website capabilities, and optional signed-in user/account context.
- If user-specific data like latest order, cart, wishlist, or profile is not actually provided, clearly say that and guide the user to the correct page.
- Never invent products, discounts, stock, account details, delivery dates, policies, or website features.
- Recommend only products that actually exist in the provided catalog context.

Behavior rules:
- Detect intent first. Do not assume every query is about products.
- For feature/navigation questions, provide step-by-step guidance.
- For policy/information questions, explain simply.
- For shopping queries, apply all provided filters together correctly.
- Support discount, price, rating, category, and combined filtering.
- If exact filter matches are not available, suggest the closest grounded alternatives.
- If the query is unclear, ask one short clarification question.

Product response rules:
- Recommend products only for shopping-related queries.
- When helpful, mention why the suggested items match the request.
- Keep productIds to at most 3 grounded IDs from the provided catalog.

Return strict JSON only with this shape:
{
  "reply": "short helpful response",
  "productIds": ["id1", "id2"],
  "needsClarification": false
}

Rules for JSON:
- "productIds" must contain only IDs from the provided catalog context.
- Use an empty array if no product should be recommended.
- Set "needsClarification" to true when the request is too unclear or missing a key filter.`;

const CATEGORY_ALIASES = [
  { category: "Grocery", terms: ["grocery", "groceries"] },
  {
    category: "Electronics",
    terms: ["electronics", "electronic", "gadgets", "gadget"],
  },
  { category: "Fashion", terms: ["fashion", "clothes", "clothing", "apparel"] },
  { category: "Footwear", terms: ["footwear"] },
  { category: "Beauty", terms: ["beauty"] },
  { category: "Wellness", terms: ["wellness", "healthcare"] },
  { category: "Bag", terms: ["bag", "bags", "backpack", "purse", "wallet"] },
  { category: "Jewellery", terms: ["jewellery", "jewelry"] },
];

const SHOPPING_TERMS = [
  "product",
  "products",
  "shop",
  "shopping",
  "buy",
  "show",
  "suggest",
  "recommend",
  "dikhao",
  "chahiye",
  "cheap",
  "budget",
  "discount",
  "off",
  "offer",
  "price",
  "rating",
  "star",
];

const WEBSITE_GUIDES = [
  {
    terms: [
      "theme",
      "dark mode",
      "light mode",
      "night mode",
      "day mode",
      "appearance",
    ],
    reply:
      "Theme change karne ke liye: 1. Profile ya account section open karo. 2. Settings page par jao. 3. Theme toggle use karke Day mode ya Night mode select karo. 4. Preference automatically save ho jayegi.",
  },
  {
    terms: ["settings"],
    reply:
      "Settings open karne ke liye: Home ya header se account/profile section open karo, phir Settings page par jao. Wahan theme aur appearance preferences manage kar sakte ho.",
  },
  {
    terms: ["wishlist"],
    reply:
      "Wishlist dekhne ke liye home page ka Navigation bar me dekho whishlist icon show hoga rahega  Wishlist section open karo. Product cards aur product details se items wishlist me add ya remove kar sakte ho.",
  },
  {
    terms: ["cart"],
    reply:
      "Cart use karne ke liye product card ya product details se item add karo, phir cart section open karke quantity change karo aur checkout continue karo.",
  },
  {
    terms: ["support", "help chat", "customer support"],
    reply:
      "Support ke liye support section open karo. Agar aap signed in ho to direct message conversation start ya continue kar sakte ho.",
  },
];

const POLICY_GUIDES = [
  {
    terms: ["terms", "terms and conditions", "conditions", "rules"],
    reply: `${companyPages.terms.description} Key points: ${companyPages.terms.highlights.join(" ")}`,
  },
  {
    terms: ["legal", "legal notice"],
    reply: `${companyPages["legal-notice"].description} Key points: ${companyPages["legal-notice"].highlights.join(" ")}`,
  },
  {
    terms: ["delivery", "shipping", "shipment"],
    reply: `${companyPages.delivery.description} Key points: ${companyPages.delivery.highlights.join(" ")}`,
  },
  {
    terms: ["payment", "secure payment", "cod", "cash on delivery"],
    reply: `${companyPages["secure-payment"].description} Key points: ${companyPages["secure-payment"].highlights.join(" ")}`,
  },
  {
    terms: ["about us", "about classy store", "company"],
    reply: `${companyPages["about-us"].description} Key points: ${companyPages["about-us"].highlights.join(" ")}`,
  },
  {
    terms: ["privacy", "privacy policy"],
    reply:
      "Is website par abhi dedicated Privacy Policy page visibly available nahi hai. Agar aapko account ya data handling ke bare me help chahiye to support se contact karo ya available legal pages dekh lo.",
  },
  {
    terms: ["refund policy", "return policy", "refund", "return"],
    reply:
      "Dedicated refund ya return policy page abhi clearly available nahi hai. Returns aur cancellations order workflow ke through handle hote hain: delivered order par return request aur pending/processing order par cancellation possible hota hai.",
  },
];

const ORDER_TERMS = [
  "order",
  "orders",
  "track",
  "tracking",
  "cancel",
  "return",
  "refund",
  "latest order",
  "my order",
];

const ACCOUNT_TERMS = [
  "profile",
  "my profile",
  "my cart",
  "my wishlist",
  "latest order",
  "my latest order",
];

const NAVIGATION_TERMS = [
  "how to",
  "kaise",
  "kaha",
  "where",
  "navigate",
  "open page",
  "go to",
];

const NON_PRODUCT_STOPWORDS = new Set([
  "kaise",
  "kare",
  "karu",
  "dikhao",
  "mujhe",
  "mera",
  "meri",
  "mere",
  "please",
  "theme",
  "change",
  "settings",
  "order",
  "track",
  "profile",
  "wishlist",
  "cart",
  "support",
  "help",
]);

const TAXONOMY_LEVEL_PRIORITY = {
  sourceLabel: 1,
  category: 2,
  subCategory: 3,
  thirdLevelCategory: 4,
};

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeForFilterParsing = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text) =>
  normalize(text)
    .split(" ")
    .filter((token) => token.length > 2);

const getUniqueTokens = (text) => [...new Set(tokenize(text))];

const parseNumericValue = (value) =>
  Number(String(value || "").replace(/[^0-9.]/g, ""));

const getDiscountPercent = (product) => {
  const originalPrice = Number(product.originalPrice || 0);
  const discountedPrice = Number(product.discountedPrice || 0);

  if (!originalPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

const getDisplayPrice = (product) =>
  Number(product.discountedPrice || product.originalPrice || 0);

const containsAnyWholeTerm = (text, terms = []) =>
  terms.some((term) => hasWholeTerm(text, term));

const detectCategoryFromText = (text) =>
  CATEGORY_ALIASES.find(({ terms }) =>
    terms.some((term) => hasWholeTerm(text, term)),
  )?.category || null;

const extractPriceFilters = (text) => {
  const normalizedText = String(text || "");
  let minPrice = null;
  let maxPrice = null;

  const rangeMatch = normalizedText.match(
    /(?:rs\.?|rupees|₹)?\s*(\d[\d,]*)\s*(?:-|to|se)\s*(?:rs\.?|rupees|₹)?\s*(\d[\d,]*)/i,
  );
  if (rangeMatch) {
    const left = parseNumericValue(rangeMatch[1]);
    const right = parseNumericValue(rangeMatch[2]);
    minPrice = Math.min(left, right);
    maxPrice = Math.max(left, right);
  }

  const underMatch = normalizedText.match(
    /(?:under|below|less than|upto|up to|within|se kam|ke andar)\s*(?:rs\.?|rupees|₹)?\s*(\d[\d,]*)/i,
  );
  if (underMatch) {
    maxPrice = parseNumericValue(underMatch[1]);
  }

  const aboveMatch = normalizedText.match(
    /(?:above|over|more than|greater than|at least|minimum|min|se jyada|se zyada)\s*(?:rs\.?|rupees|₹)?\s*(\d[\d,]*)/i,
  );
  if (aboveMatch) {
    minPrice = parseNumericValue(aboveMatch[1]);
  }

  return { minPrice, maxPrice };
};

const extractRatingFilter = (text) => {
  const normalizedText = String(text || "");
  const maximumPattern =
    /(?:under|below|less than|maximum|max|se kam)\s*(\d(?:\.\d+)?)\s*(?:star|stars|rating)/i;
  const minimumPattern =
    /(?:above|over|at least|min|minimum|se upar|ya usse upar|and above)\s*(\d(?:\.\d+)?)\s*(?:star|stars|rating)/i;
  const postMinimumPattern =
    /(\d(?:\.\d+)?)\s*(?:star|stars|rating)\s*(?:and above|or above|ya usse upar|se upar|\+)/i;
  const postMaximumPattern =
    /(\d(?:\.\d+)?)\s*(?:star|stars|rating)\s*(?:and below|or below|ya usse kam|se kam)/i;
  const exactPattern = /(\d(?:\.\d+)?)\s*(?:star|stars|rating)/i;

  const maximumMatch = normalizedText.match(maximumPattern);
  if (maximumMatch) {
    return {
      minRating: null,
      exactRating: null,
      maxRating: Number(maximumMatch[1]),
    };
  }

  const minimumMatch = normalizedText.match(minimumPattern);
  if (minimumMatch) {
    return {
      minRating: Number(minimumMatch[1]),
      exactRating: null,
      maxRating: null,
    };
  }

  const postMinimumMatch = normalizedText.match(postMinimumPattern);
  if (postMinimumMatch) {
    return {
      minRating: Number(postMinimumMatch[1]),
      exactRating: null,
      maxRating: null,
    };
  }

  const postMaximumMatch = normalizedText.match(postMaximumPattern);
  if (postMaximumMatch) {
    return {
      minRating: null,
      exactRating: null,
      maxRating: Number(postMaximumMatch[1]),
    };
  }

  const exactMatch = normalizedText.match(exactPattern);
  if (exactMatch) {
    return {
      minRating: null,
      exactRating: Number(exactMatch[1]),
      maxRating: null,
    };
  }

  return {
    minRating: null,
    exactRating: null,
    maxRating: null,
  };
};

const extractDiscountFilter = (text) => {
  const normalizedText = String(text || "");
  const percentToken = "(?:%|percent|percentage)";
  const maxDiscountMatch =
    normalizedText.match(
      new RegExp(
        `(?:under|below|less than|maximum|max|se kam)\\s*(\\d{1,3})\\s*${percentToken}\\s*(?:off|discount)?`,
        "i",
      ),
    ) ||
    normalizedText.match(
      new RegExp(
        `(\\d{1,3})\\s*${percentToken}\\s*(?:and below|or below|ya usse kam|se kam)`,
        "i",
      ),
    );

  if (maxDiscountMatch) {
    return {
      minDiscount: null,
      exactDiscount: null,
      maxDiscount: Number(maxDiscountMatch[1]),
      targetDiscount: Number(maxDiscountMatch[1]),
    };
  }

  const minDiscountMatch =
    normalizedText.match(
      new RegExp(
        `(?:above|over|more than|at least|min|minimum|se jyada|se zyada)\\s*(\\d{1,3})\\s*${percentToken}\\s*(?:off|discount)?`,
        "i",
      ),
    ) ||
    normalizedText.match(
      new RegExp(
        `(\\d{1,3})\\s*${percentToken}\\s*(?:se jyada|se zyada|or more|and above|ya usse jyada|ya usse upar)`,
        "i",
      ),
    );

  if (minDiscountMatch) {
    return {
      minDiscount: Number(minDiscountMatch[1]),
      exactDiscount: null,
      maxDiscount: null,
      targetDiscount: Number(minDiscountMatch[1]),
    };
  }

  const directDiscountMatch = normalizedText.match(
    new RegExp(`(\\d{1,3})\\s*${percentToken}\\s*(?:off|discount)`, "i"),
  );

  if (directDiscountMatch) {
    return {
      minDiscount: null,
      exactDiscount: Number(directDiscountMatch[1]),
      maxDiscount: null,
      targetDiscount: Number(directDiscountMatch[1]),
    };
  }

  return {
    minDiscount: null,
    exactDiscount: null,
    maxDiscount: null,
    targetDiscount: null,
  };
};

const extractShoppingFilters = (message) => {
  const normalizedMessage = normalize(message);
  const rawFilterText = normalizeForFilterParsing(message);
  const { minPrice, maxPrice } = extractPriceFilters(rawFilterText);
  const { minDiscount, exactDiscount, maxDiscount, targetDiscount } =
    extractDiscountFilter(rawFilterText);
  const { minRating, exactRating, maxRating } =
    extractRatingFilter(rawFilterText);

  return {
    category: detectCategoryFromText(normalizedMessage),
    minPrice,
    maxPrice,
    minRating,
    exactRating,
    maxRating,
    minDiscount,
    exactDiscount,
    maxDiscount,
    targetDiscount,
    budgetPreference: containsAnyWholeTerm(normalizedMessage, [
      "cheap",
      "budget",
      "affordable",
      "lowest price",
      "low price",
      "sasta",
      "kam daam",
    ]),
  };
};

const countExplicitFilters = (filters) =>
  [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.exactRating,
    filters.maxRating,
    filters.minDiscount,
    filters.exactDiscount,
    filters.maxDiscount,
    filters.budgetPreference,
  ].filter((value) => value !== null && value !== false).length;

const getFilterSummary = (filters) =>
  [
    filters.category ? filters.category.toLowerCase() : null,
    filters.exactDiscount !== null
      ? `${filters.exactDiscount}% discount`
      : null,
    filters.minDiscount ? `${filters.minDiscount}%+ discount` : null,
    filters.maxDiscount !== null
      ? `under ${filters.maxDiscount}% discount`
      : null,
    filters.exactRating !== null ? `${filters.exactRating} rating` : null,
    filters.minRating ? `${filters.minRating}+ rating` : null,
    filters.maxRating !== null ? `under ${filters.maxRating} rating` : null,
    filters.minPrice !== null && filters.maxPrice !== null
      ? `Rs ${filters.minPrice} to Rs ${filters.maxPrice}`
      : null,
    filters.maxPrice !== null && filters.minPrice === null
      ? `under Rs ${filters.maxPrice}`
      : null,
    filters.minPrice !== null && filters.maxPrice === null
      ? `above Rs ${filters.minPrice}`
      : null,
    filters.budgetPreference ? "budget-friendly" : null,
  ]
    .filter(Boolean)
    .join(", ");

const damerauLevenshteinDistance = (left, right) => {
  const a = String(left || "");
  const b = String(right || "");

  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, col) =>
      row === 0 ? col : col === 0 ? row : 0,
    ),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const substitutionCost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + substitutionCost,
      );

      if (
        row > 1 &&
        col > 1 &&
        a[row - 1] === b[col - 2] &&
        a[row - 2] === b[col - 1]
      ) {
        matrix[row][col] = Math.min(
          matrix[row][col],
          matrix[row - 2][col - 2] + 1,
        );
      }
    }
  }

  return matrix[a.length][b.length];
};

const isCloseTokenMatch = (token, candidateToken) => {
  if (!token || !candidateToken) return false;
  if (token === candidateToken) return true;
  if (token.length <= 3 || candidateToken.length <= 3) return false;

  const distance = damerauLevenshteinDistance(token, candidateToken);
  const longestLength = Math.max(token.length, candidateToken.length);
  const maxAllowedDistance =
    longestLength >= 8 ? 2 : Math.max(1, Math.floor(longestLength / 5));
  return distance <= maxAllowedDistance;
};

const getSearchText = (product) =>
  normalize(
    [
      product.name,
      product.brand,
      product.category,
      product.sourceLabel,
      product.subCategory,
      product.thirdLevelCategory,
      product.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

const getProductTokens = (product) =>
  getUniqueTokens(
    [
      product.name,
      product.brand,
      product.category,
      product.sourceLabel,
      product.subCategory,
      product.thirdLevelCategory,
      product.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

const hasWholeToken = (text, token) =>
  new RegExp(
    `(^|[^a-z0-9])${String(token || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
  ).test(normalize(text));

const getKnownBrands = (catalog) => [
  ...new Set(
    catalog.map((product) => normalize(product.brand)).filter(Boolean),
  ),
];

const getProductTaxonomyEntries = (product) => {
  const rootCategory = product.sourceLabel || product.category || "";

  return [
    { level: "sourceLabel", value: product.sourceLabel, rootCategory },
    { level: "category", value: product.category, rootCategory },
    { level: "subCategory", value: product.subCategory, rootCategory },
    {
      level: "thirdLevelCategory",
      value: product.thirdLevelCategory,
      rootCategory,
    },
  ].filter(({ value }) => normalize(value));
};

const getCatalogTaxonomyEntries = (catalog) => {
  const taxonomyMap = new Map();

  catalog.forEach((product) => {
    getProductTaxonomyEntries(product).forEach(
      ({ level, value, rootCategory }) => {
        const normalizedValue = normalize(value);
        const normalizedRootCategory = normalize(rootCategory);
        const key = `${level}:${normalizedRootCategory}:${normalizedValue}`;

        if (!taxonomyMap.has(key)) {
          taxonomyMap.set(key, {
            level,
            value,
            normalizedValue,
            rootCategory,
            normalizedRootCategory,
            tokens: getUniqueTokens(value),
          });
        }
      },
    );
  });

  return [...taxonomyMap.values()];
};

const getTaxonomyIntentScore = (entry, queryTokens, normalizedQuery) => {
  if (!entry?.normalizedValue || !queryTokens.length) {
    return 0;
  }

  let score = 0;
  const exactPhraseMatch = hasWholeTerm(normalizedQuery, entry.normalizedValue);
  const exactTokenHits = entry.tokens.filter((entryToken) =>
    queryTokens.some((queryToken) => queryToken === entryToken),
  ).length;
  const fuzzyTokenHits = entry.tokens.filter((entryToken) =>
    queryTokens.some((queryToken) => isCloseTokenMatch(queryToken, entryToken)),
  ).length;

  if (!exactPhraseMatch && !exactTokenHits && !fuzzyTokenHits) {
    return 0;
  }

  if (normalizedQuery === entry.normalizedValue) {
    score += 90;
  }

  if (exactPhraseMatch) {
    score += 60;
  }

  score += exactTokenHits * 24;
  score += fuzzyTokenHits * 14;
  score += TAXONOMY_LEVEL_PRIORITY[entry.level] * 6;

  if (
    entry.tokens.length &&
    exactTokenHits + fuzzyTokenHits >= entry.tokens.length
  ) {
    score += 16;
  }

  if (queryTokens.length === 1 && fuzzyTokenHits > 0) {
    score += 8;
  }

  return score;
};

const detectCatalogTaxonomyIntent = (catalog, query) => {
  const normalizedQuery = normalize(query);
  const queryTokens = getUniqueTokens(normalizedQuery).filter(
    (token) =>
      !NON_PRODUCT_STOPWORDS.has(token) &&
      !SHOPPING_TERMS.includes(token) &&
      !ORDER_TERMS.includes(token) &&
      !ACCOUNT_TERMS.includes(token),
  );

  if (!queryTokens.length) {
    return null;
  }

  let bestMatch = null;

  getCatalogTaxonomyEntries(catalog).forEach((entry) => {
    const score = getTaxonomyIntentScore(entry, queryTokens, normalizedQuery);
    if (!score) {
      return;
    }

    if (
      !bestMatch ||
      score > bestMatch.score ||
      (score === bestMatch.score &&
        TAXONOMY_LEVEL_PRIORITY[entry.level] >
          TAXONOMY_LEVEL_PRIORITY[bestMatch.level])
    ) {
      bestMatch = {
        ...entry,
        score,
      };
    }
  });

  return bestMatch && bestMatch.score >= 28 ? bestMatch : null;
};

const matchesTaxonomyIntent = (product, taxonomyIntent) => {
  if (!taxonomyIntent?.normalizedValue) {
    return true;
  }

  return getProductTaxonomyEntries(product).some(
    ({ level, value }) =>
      level === taxonomyIntent.level &&
      normalize(value) === taxonomyIntent.normalizedValue,
  );
};

const detectBrandIntent = (catalog, query) => {
  const queryTokens = getUniqueTokens(query).filter(
    (token) => !NON_PRODUCT_STOPWORDS.has(token),
  );
  if (!queryTokens.length) return null;

  const brands = getKnownBrands(catalog);
  let bestMatch = null;

  brands.forEach((brand) => {
    const brandTokens = getUniqueTokens(brand);
    if (!brandTokens.length) return;

    const exactHits = brandTokens.filter((brandToken) =>
      queryTokens.some((queryToken) => queryToken === brandToken),
    ).length;

    const fuzzyHits = brandTokens.filter((brandToken) =>
      queryTokens.some(
        (queryToken) =>
          queryToken.length >= 5 &&
          brandToken.length >= 5 &&
          isCloseTokenMatch(queryToken, brandToken),
      ),
    ).length;

    const score = exactHits * 3 + fuzzyHits;
    if (exactHits === 0 && score < 2) return;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        brand,
        score,
      };
    }
  });

  return bestMatch?.brand || null;
};

const getCandidateScore = (product, query) => {
  const tokens = getUniqueTokens(query);
  const searchText = getSearchText(product);
  const productTokens = getProductTokens(product);
  const productName = normalize(product.name);
  const productBrand = normalize(product.brand);
  const productSubCategory = normalize(product.subCategory);
  const productThirdLevelCategory = normalize(product.thirdLevelCategory);
  let score = 0;
  let hits = 0;
  let exactHits = 0;
  let fuzzyHits = 0;

  tokens.forEach((token) => {
    const hasExactTextMatch = hasWholeToken(searchText, token);
    const hasNameExactMatch = hasWholeToken(productName, token);
    const hasBrandExactMatch = hasWholeToken(productBrand, token);
    const hasSubcategoryExactMatch = hasWholeToken(productSubCategory, token);
    const hasThirdLevelExactMatch = hasWholeToken(
      productThirdLevelCategory,
      token,
    );
    const closeProductToken = productTokens.some((productToken) =>
      isCloseTokenMatch(token, productToken),
    );

    if (hasExactTextMatch) {
      score += 18;
      hits += 1;
      exactHits += 1;
    }

    if (hasNameExactMatch) {
      score += 22;
      hits += 1;
      exactHits += 1;
    }

    if (hasBrandExactMatch) {
      score += 30;
      hits += 1;
      exactHits += 1;
    }

    if (hasSubcategoryExactMatch) {
      score += 12;
      hits += 1;
      exactHits += 1;
    }

    if (hasThirdLevelExactMatch) {
      score += 12;
      hits += 1;
      exactHits += 1;
    }

    if (
      !hasExactTextMatch &&
      !hasNameExactMatch &&
      !hasBrandExactMatch &&
      !hasSubcategoryExactMatch &&
      !hasThirdLevelExactMatch &&
      closeProductToken
    ) {
      score += 11;
      hits += 1;
      fuzzyHits += 1;
    }
  });

  if (!hits) return 0;

  if (!exactHits && fuzzyHits < Math.min(2, tokens.length)) {
    return 0;
  }

  score += Number(product.rating || 0) * 4;
  score += Number(product.inStock || 0) > 0 ? 6 : -10;
  return score;
};

const isFeatureOrPolicyQuery = (text) =>
  containsAnyWholeTerm(
    text,
    WEBSITE_GUIDES.flatMap((item) => item.terms),
  ) ||
  containsAnyWholeTerm(
    text,
    POLICY_GUIDES.flatMap((item) => item.terms),
  );

const isOrderQuery = (text) => containsAnyWholeTerm(text, ORDER_TERMS);

const isAccountQuery = (text) => containsAnyWholeTerm(text, ACCOUNT_TERMS);

const looksLikeDirectProductLookup = (text) => {
  const normalizedText = normalize(text);
  const tokens = getUniqueTokens(normalizedText);

  if (!tokens.length || tokens.length > 4) {
    return false;
  }

  if (
    isGreetingMessage(normalizedText) ||
    isUnsupportedQuery(normalizedText) ||
    isFeatureOrPolicyQuery(normalizedText) ||
    isOrderQuery(normalizedText) ||
    isAccountQuery(normalizedText) ||
    containsAnyWholeTerm(normalizedText, NAVIGATION_TERMS)
  ) {
    return false;
  }

  return true;
};

const isShoppingQuery = (text) => {
  const filters = extractShoppingFilters(text);
  const normalizedText = normalize(text);
  return (
    countExplicitFilters(filters) > 0 ||
    containsAnyWholeTerm(normalizedText, SHOPPING_TERMS) ||
    Boolean(detectCategoryFromText(normalizedText)) ||
    looksLikeDirectProductLookup(normalizedText)
  );
};

const hasStrictNumericFilter = (filters) =>
  [
    filters.minDiscount,
    filters.exactDiscount,
    filters.maxDiscount,
    filters.minRating,
    filters.exactRating,
    filters.maxRating,
    filters.minPrice,
    filters.maxPrice,
  ].some((value) => value !== null);

const matchesShoppingFilters = (product, filters) => {
  const displayPrice = getDisplayPrice(product);
  const rating = Number(product.rating || 0);
  const discountPercent = getDiscountPercent(product);
  const category = normalize(product.sourceLabel || product.category);

  if (filters.category && category !== normalize(filters.category)) {
    return false;
  }

  if (filters.minPrice !== null && displayPrice < filters.minPrice) {
    return false;
  }

  if (filters.maxPrice !== null && displayPrice > filters.maxPrice) {
    return false;
  }

  if (filters.exactRating !== null && rating !== filters.exactRating) {
    return false;
  }

  if (filters.minRating !== null && rating < filters.minRating) {
    return false;
  }

  if (filters.maxRating !== null && rating > filters.maxRating) {
    return false;
  }

  if (
    filters.exactDiscount !== null &&
    discountPercent !== filters.exactDiscount
  ) {
    return false;
  }

  if (filters.minDiscount !== null && discountPercent < filters.minDiscount) {
    return false;
  }

  if (filters.maxDiscount !== null && discountPercent > filters.maxDiscount) {
    return false;
  }

  return true;
};

const getShoppingRelaxedScore = (product, filters, query) => {
  const displayPrice = getDisplayPrice(product);
  const rating = Number(product.rating || 0);
  const discountPercent = getDiscountPercent(product);
  let score = getCandidateScore(product, query);
  let matchedRules = 0;

  if (filters.category) {
    if (
      normalize(product.sourceLabel || product.category) ===
      normalize(filters.category)
    ) {
      score += 30;
      matchedRules += 1;
    } else {
      score -= 30;
    }
  }

  if (filters.minPrice !== null) {
    const distance = Math.max(0, filters.minPrice - displayPrice);
    score += Math.max(0, 18 - distance / 50);
    if (displayPrice >= filters.minPrice) matchedRules += 1;
  }

  if (filters.maxPrice !== null) {
    const distance = Math.max(0, displayPrice - filters.maxPrice);
    score += Math.max(0, 18 - distance / 50);
    if (displayPrice <= filters.maxPrice) matchedRules += 1;
  }

  if (filters.minRating !== null) {
    score += Math.max(0, 16 - Math.max(0, filters.minRating - rating) * 8);
    if (rating >= filters.minRating) matchedRules += 1;
  }

  if (filters.exactRating !== null) {
    score += Math.max(0, 20 - Math.abs(filters.exactRating - rating) * 20);
    if (rating === filters.exactRating) matchedRules += 1;
  }

  if (filters.maxRating !== null) {
    score += Math.max(0, 16 - Math.max(0, rating - filters.maxRating) * 8);
    if (rating <= filters.maxRating) matchedRules += 1;
  }

  if (filters.minDiscount !== null) {
    score += Math.max(
      0,
      16 - Math.max(0, filters.minDiscount - discountPercent),
    );
    if (discountPercent >= filters.minDiscount) matchedRules += 1;
  }

  if (filters.exactDiscount !== null) {
    score += Math.max(
      0,
      20 - Math.abs(filters.exactDiscount - discountPercent) * 2,
    );
    if (discountPercent === filters.exactDiscount) matchedRules += 1;
  }

  if (filters.maxDiscount !== null) {
    score += Math.max(
      0,
      16 - Math.max(0, discountPercent - filters.maxDiscount),
    );
    if (discountPercent <= filters.maxDiscount) matchedRules += 1;
  }

  if (filters.budgetPreference) {
    score += Math.max(0, 20 - displayPrice / 250);
  }

  return {
    score,
    matchedRules,
  };
};

const getShoppingSearchContext = (catalog, query) => {
  const normalizedQuery = normalize(query);
  const filters = extractShoppingFilters(query);
  const shoppingIntent = isShoppingQuery(query);

  if (
    !shoppingIntent ||
    isFeatureOrPolicyQuery(normalizedQuery) ||
    isOrderQuery(normalizedQuery)
  ) {
    return {
      filters,
      candidates: [],
      exactMatches: [],
      relaxedMatches: [],
      brandIntent: null,
      taxonomyIntent: null,
    };
  }

  const brandIntent = detectBrandIntent(catalog, normalizedQuery);
  const taxonomyIntent = detectCatalogTaxonomyIntent(catalog, query);
  let scopedCatalog = brandIntent
    ? catalog.filter((product) => normalize(product.brand) === brandIntent)
    : catalog;

  if (filters.category) {
    scopedCatalog = scopedCatalog.filter(
      (product) =>
        normalize(product.sourceLabel || product.category) ===
        normalize(filters.category),
    );
  }

  if (taxonomyIntent) {
    scopedCatalog = scopedCatalog.filter((product) =>
      matchesTaxonomyIntent(product, taxonomyIntent),
    );
  }

  const exactMatches = scopedCatalog
    .filter((product) => matchesShoppingFilters(product, filters))
    .map((product) => ({
      ...product,
      aiCandidateScore: getCandidateScore(product, normalizedQuery),
    }))
    .filter(
      (product) =>
        product.aiCandidateScore > 0 || countExplicitFilters(filters) > 0,
    )
    .sort((left, right) => {
      if (filters.budgetPreference) {
        return (
          getDisplayPrice(left) - getDisplayPrice(right) ||
          right.aiCandidateScore - left.aiCandidateScore
        );
      }

      return (
        right.aiCandidateScore - left.aiCandidateScore ||
        getDiscountPercent(right) - getDiscountPercent(left) ||
        Number(right.rating || 0) - Number(left.rating || 0)
      );
    });

  const relaxedMatches = scopedCatalog
    .map((product) => {
      const relaxed = getShoppingRelaxedScore(
        product,
        filters,
        normalizedQuery,
      );
      return {
        ...product,
        aiCandidateScore: relaxed.score,
        matchedRules: relaxed.matchedRules,
      };
    })
    .filter((product) => product.aiCandidateScore > 0)
    .sort((left, right) => {
      if (right.matchedRules !== left.matchedRules) {
        return right.matchedRules - left.matchedRules;
      }

      return right.aiCandidateScore - left.aiCandidateScore;
    });

  const candidatesSource = exactMatches.length ? exactMatches : relaxedMatches;

  return {
    filters,
    brandIntent,
    taxonomyIntent,
    exactMatches: exactMatches.slice(0, 12),
    relaxedMatches: relaxedMatches.slice(0, 12),
    candidates: candidatesSource
      .slice(0, 24)
      .map(
        ({
          _id,
          name,
          brand,
          sourceLabel,
          aiCandidateScore,
          category,
          subCategory,
          thirdLevelCategory,
          discountedPrice,
          originalPrice,
          rating,
          inStock,
          description,
          routePrefix,
          detailPath,
        }) => ({
          _id,
          name,
          brand,
          sourceLabel,
          aiCandidateScore,
          category,
          subCategory,
          thirdLevelCategory,
          discountedPrice,
          originalPrice,
          rating,
          inStock,
          routePrefix,
          detailPath,
          description: String(description || "").slice(0, 220),
        }),
      ),
  };
};

const pickCatalogCandidates = (catalog, query) => {
  return getShoppingSearchContext(catalog, query).candidates;
};

const extractJsonObject = (text) => {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(match[0]);
};

const getResponseText = (payload) =>
  String(payload?.choices?.[0]?.message?.content || payload?.output_text || "");

const sleep = (duration) =>
  new Promise((resolve) => {
    setTimeout(resolve, duration);
  });

const createAbortError = () => {
  const error = new Error("The operation was aborted");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

const splitReplyIntoChunks = (reply) =>
  String(reply || "").match(/\S+\s*/g) || [];

async function* streamLocalReply(reply, signal) {
  const chunks = splitReplyIntoChunks(reply);

  for (const chunk of chunks) {
    throwIfAborted(signal);
    yield chunk;
    await sleep(25);
  }
}

const mapMessagesToPrompt = (messages = []) =>
  messages
    .slice(-6)
    .map((message) => {
      const content = String(message.content || message.text || "").trim();
      if (!content) return null;
      return `${message.role === "assistant" ? "Assistant" : "User"}: ${content}`;
    })
    .filter(Boolean)
    .join("\n");

const buildPromptContext = ({
  message,
  messages,
  candidates,
  filters,
  userContext,
}) =>
  [
    "Conversation history:",
    mapMessagesToPrompt(messages) || "No previous messages.",
    "",
    `Current user message: ${message}`,
    "",
    "Recognized shopping filters:",
    JSON.stringify(filters || {}, null, 2),
    "",
    "Known website routes and pages:",
    JSON.stringify(
      {
        account: [
          "/profile",
          "/settings",
          "/orders",
          "/order/:orderId",
          "/cart",
          "/product-wishlist",
          "/support",
        ],
        infoPages: [
          "/company/delivery",
          "/company/legal-notice",
          "/company/terms",
          "/company/about-us",
          "/company/secure-payment",
        ],
      },
      null,
      2,
    ),
    "",
    "Signed-in user context:",
    buildUserContextSummary(userContext),
    "",
    "Available product catalog candidates:",
    candidates.length ? JSON.stringify(candidates, null, 2) : "[]",
    "",
    "If the candidate list is empty or does not contain relevant items, answer without product recommendations.",
  ].join("\n");

const hasWholeTerm = (text, term) =>
  new RegExp(
    `(^|[^a-z0-9])${String(term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
  ).test(normalize(text));

const KNOWLEDGE_REPLIES = [...WEBSITE_GUIDES, ...POLICY_GUIDES];

const UNSUPPORTED_TERMS = [
  "hotel",
  "flight",
  "doctor",
  "hospital",
  "movie",
  "plumber",
  "electrician",
  "job",
  "loan",
  "insurance",
  "restaurant",
  "taxi",
  "cab",
];

const isGreetingMessage = (text) =>
  ["hi", "hii", "hello", "hey", "good morning", "good evening"].some((term) =>
    hasWholeTerm(text, term),
  );

const findCategoryHint = (text) =>
  CATEGORY_ALIASES.find(({ terms }) =>
    terms.some((term) => hasWholeTerm(text, term)),
  );

const findKnowledgeReply = (text) =>
  KNOWLEDGE_REPLIES.find(({ terms }) =>
    terms.some((term) => hasWholeTerm(text, term)),
  );

const isUnsupportedQuery = (text) =>
  UNSUPPORTED_TERMS.some((term) => hasWholeTerm(text, term));

const loadAiUserContext = async (userId) => {
  if (!userId) return null;

  const [user, latestOrder, cart, wishlist] = await Promise.all([
    User.findById(userId).select("name email phone addresses").lean(),
    Order.findOne({ userId })
      .sort({ createdAt: -1 })
      .select(
        "orderId orderStatus totalAmount createdAt paymentMethod items shippingAddress",
      )
      .lean(),
    Cart.findOne({ userId }).select("items").lean(),
    Wishlist.findOne({ userId }).select("items").lean(),
  ]);

  if (!user) return null;

  const defaultAddress =
    user.addresses?.find((address) => address.isDefault) ||
    user.addresses?.[0] ||
    null;

  return {
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    location: defaultAddress
      ? [defaultAddress.city, defaultAddress.district, defaultAddress.state]
          .filter(Boolean)
          .join(", ")
      : "",
    cartCount: cart?.items?.length || 0,
    wishlistCount: wishlist?.items?.length || 0,
    latestOrder: latestOrder
      ? {
          orderId: latestOrder.orderId,
          orderStatus: latestOrder.orderStatus,
          totalAmount: latestOrder.totalAmount,
          createdAt: latestOrder.createdAt,
          paymentMethod: latestOrder.paymentMethod,
          itemCount: latestOrder.items?.length || 0,
          firstProductName: latestOrder.items?.[0]?.productName || "",
        }
      : null,
  };
};

const buildUserContextSummary = (userContext) => {
  if (!userContext) {
    return "No signed-in user context is available for this request.";
  }

  return JSON.stringify(
    {
      name: userContext.name || undefined,
      location: userContext.location || undefined,
      cartCount: userContext.cartCount,
      wishlistCount: userContext.wishlistCount,
      latestOrder: userContext.latestOrder || undefined,
    },
    null,
    2,
  );
};

const formatOrderStatusLabel = (status) =>
  String(status || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const buildAccountAwareReply = ({ message, userContext }) => {
  const normalizedMessage = normalize(message);

  if (
    containsAnyWholeTerm(normalizedMessage, ["latest order", "my latest order"])
  ) {
    if (!userContext?.latestOrder) {
      return {
        reply:
          "Main aapka latest order tabhi bata sakta hoon jab signed-in account context available ho. Aap Orders page open karke latest order dekh sakte ho.",
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply: `Aapka latest order ${userContext.latestOrder.orderId} hai. Iska current status ${formatOrderStatusLabel(userContext.latestOrder.orderStatus)} hai aur total amount Rs ${userContext.latestOrder.totalAmount}. Detailed tracking ke liye Orders page open karo.`,
      needsClarification: false,
      products: [],
    };
  }

  if (
    containsAnyWholeTerm(normalizedMessage, [
      "track order",
      "order track",
      "order tracking",
      "track my order",
    ])
  ) {
    if (userContext?.latestOrder) {
      return {
        reply: `Aapke latest order ${userContext.latestOrder.orderId} ka status abhi ${formatOrderStatusLabel(userContext.latestOrder.orderStatus)} hai. Track karne ke liye: Profile ya account se Orders open karo, phir latest order details page par jao.`,
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply:
        "Order track karne ke liye: 1. Account ya Profile section open karo. 2. Orders page par jao. 3. Latest order open karo. 4. Wahan pending, processing, shipped, out for delivery, delivered ya cancelled status dekh sakte ho.",
      needsClarification: false,
      products: [],
    };
  }

  if (
    containsAnyWholeTerm(normalizedMessage, ["cancel order", "cancel my order"])
  ) {
    if (userContext?.latestOrder) {
      const status = normalize(userContext.latestOrder.orderStatus);
      if (["pending", "processing"].includes(status)) {
        return {
          reply: `Aap latest order ${userContext.latestOrder.orderId} ko cancel request kar sakte ho, kyunki abhi iska status ${formatOrderStatusLabel(status)} hai. Orders page open karke order details me jao aur cancel option use karo.`,
          needsClarification: false,
          products: [],
        };
      }

      return {
        reply: `Latest order ${userContext.latestOrder.orderId} ka status ${formatOrderStatusLabel(status)} hai. Is stage par direct cancel usually allowed nahi hota. Agar order delivered ho chuka hai to return workflow use karna padega.`,
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply:
        "Order cancel karne ke liye Orders page open karo aur order details me jao. Pending ya Processing status wale orders hi cancel kiye ja sakte hain.",
      needsClarification: false,
      products: [],
    };
  }

  if (containsAnyWholeTerm(normalizedMessage, ["my cart"])) {
    if (!userContext) {
      return {
        reply:
          "Signed-in cart context abhi available nahi hai. Aap cart section open karke cart items dekh sakte ho.",
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply: `Aapke cart me abhi ${userContext.cartCount} item group hai. Details ke liye Cart page open karo.`,
      needsClarification: false,
      products: [],
    };
  }

  if (containsAnyWholeTerm(normalizedMessage, ["my wishlist"])) {
    if (!userContext) {
      return {
        reply:
          "Signed-in wishlist context abhi available nahi hai. Aap wishlist section open karke saved items dekh sakte ho.",
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply: `Aapki wishlist me abhi ${userContext.wishlistCount} saved item hai. Details ke liye Wishlist page open karo.`,
      needsClarification: false,
      products: [],
    };
  }

  if (
    containsAnyWholeTerm(normalizedMessage, ["my profile", "profile details"])
  ) {
    if (!userContext) {
      return {
        reply:
          "Signed-in profile context abhi available nahi hai. Aap profile section open karke apni details dekh sakte ho.",
        needsClarification: false,
        products: [],
      };
    }

    return {
      reply: `Aapke profile me name ${userContext.name || "available"} hai${userContext.location ? ` aur default location ${userContext.location}` : ""}. Profile details update karne ke liye profile section open karo.`,
      needsClarification: false,
      products: [],
    };
  }

  return null;
};

const buildContextualUnavailableReply = ({ message, catalog, filters }) => {
  const normalizedMessage = normalize(message);
  const filterSummary = getFilterSummary(filters);
  const categoryHint = findCategoryHint(normalizedMessage);
  const brandIntent = isShoppingQuery(message)
    ? detectBrandIntent(catalog, message)
    : null;
  const taxonomyIntent = isShoppingQuery(message)
    ? detectCatalogTaxonomyIntent(catalog, message)
    : null;

  if (taxonomyIntent) {
    return {
      reply: filterSummary
        ? `Classy Store par abhi ${taxonomyIntent.value} me ${filterSummary} ke hisaab se koi matching product available nahi mila.`
        : `Classy Store par abhi ${taxonomyIntent.value} se related koi matching product available nahi mila.`,
      needsClarification: false,
      products: [],
    };
  }

  if (categoryHint) {
    return {
      reply: filterSummary
        ? `Classy Store par abhi ${filterSummary} ke hisaab se koi ${categoryHint.category.toLowerCase()} product available nahi mila.`
        : `Classy Store par abhi ${categoryHint.category.toLowerCase()} category me koi matching product available nahi mila.`,
      needsClarification: false,
      products: [],
    };
  }

  if (brandIntent) {
    return {
      reply: filterSummary
        ? `Mujhe ${brandIntent} brand me ${filterSummary} ke hisaab se koi product abhi nahi mila.`
        : `Mujhe ${brandIntent} brand ke matching products abhi nahi mile.`,
      needsClarification: false,
      products: [],
    };
  }

  if (isShoppingQuery(message)) {
    return {
      reply: filterSummary
        ? `Mujhe ${filterSummary} ke hisaab se koi product abhi nahi mila.`
        : "Mujhe aapki shopping request ke hisaab se koi matching product abhi nahi mila.",
      needsClarification: false,
      products: [],
    };
  }

  if (isFeatureOrPolicyQuery(normalizedMessage)) {
    return {
      reply:
        "Main is website feature ya policy ke bare me exact grounded answer abhi confirm nahi kar pa raha hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (isOrderQuery(normalizedMessage)) {
    return {
      reply:
        "Main is order-related request ka exact answer abhi confirm nahi kar pa raha hoon. Agar aap tracking, cancellation, return, ya latest order poochna chahte ho to woh specifically likho.",
      needsClarification: false,
      products: [],
    };
  }

  if (isAccountQuery(normalizedMessage)) {
    return {
      reply:
        "Main is account-related request ka exact answer abhi confirm nahi kar pa raha hoon. Aap profile, cart, wishlist, ya latest order ko thoda clearly likh sakte ho.",
      needsClarification: false,
      products: [],
    };
  }

  return {
    reply:
      "Main is request ke liye exact grounded answer abhi confirm nahi kar pa raha hoon. Aap apna sawal thoda aur clearly likh sakte ho.",
    needsClarification: true,
    products: [],
  };
};

const buildShoppingReply = ({
  message,
  catalog,
  candidates,
  filters,
  exactMatches = [],
  relaxedMatches = [],
  taxonomyIntent = null,
}) => {
  const normalizedMessage = normalize(message);
  const filterSummary = getFilterSummary(filters);
  const requiresExactMatch =
    filters.exactDiscount !== null || filters.exactRating !== null;
  const hasStrictFilters = hasStrictNumericFilter(filters);

  if (requiresExactMatch && !exactMatches.length) {
    return {
      reply: filterSummary
        ? `Mujhe exact ${filterSummary} wala product abhi nahi mila. Isliye main galat ya approximate result nahi dikha raha hoon.`
        : "Mujhe exact requested filter wala product abhi nahi mila, isliye main approximate result nahi dikha raha hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (hasStrictFilters && !exactMatches.length) {
    return {
      reply: filterSummary
        ? `Mujhe ${filterSummary} ke hisaab se koi product abhi nahi mila. Isliye main unrelated ya approximate result nahi dikha raha hoon.`
        : "Mujhe requested filters ke hisaab se koi product abhi nahi mila. Isliye main approximate result nahi dikha raha hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (exactMatches.length && countExplicitFilters(filters) > 0) {
    return {
      reply: filterSummary
        ? `Maine aapke filters ke hisaab se ${filterSummary} wale best products nikale hain.`
        : "Maine aapke request ke hisaab se matching products nikale hain.",
      needsClarification: false,
      products: exactMatches.slice(0, 3),
    };
  }

  if (
    !hasStrictFilters &&
    !exactMatches.length &&
    relaxedMatches.length &&
    countExplicitFilters(filters) > 1
  ) {
    return {
      reply: filterSummary
        ? `Exact ${filterSummary} match nahi mila, lekin ye closest alternatives available hain.`
        : "Exact match nahi mila, lekin ye closest alternatives available hain.",
      needsClarification: false,
      products: relaxedMatches.slice(0, 3),
    };
  }

  const knowledgeReply = findKnowledgeReply(normalizedMessage);
  if (knowledgeReply) {
    return {
      reply: knowledgeReply.reply,
      needsClarification: false,
      products: [],
    };
  }

  const categoryHint = findCategoryHint(normalizedMessage);
  if (taxonomyIntent && !exactMatches.length) {
    return {
      reply: filterSummary
        ? `Classy Store par abhi ${taxonomyIntent.value} me ${filterSummary} ke hisaab se koi matching product available nahi mila.`
        : `Classy Store par abhi ${taxonomyIntent.value} se related koi matching product available nahi mila.`,
      needsClarification: false,
      products: [],
    };
  }

  if (categoryHint) {
    const categoryMatches = catalog
      .filter(
        (item) =>
          normalize(item.sourceLabel || item.category) ===
          normalize(categoryHint.category),
      )
      .map((item) => ({
        ...item,
        aiCandidateScore: getCandidateScore(item, message),
      }))
      .filter((item) => item.aiCandidateScore > 0)
      .sort((a, b) => b.aiCandidateScore - a.aiCandidateScore)
      .slice(0, 3);

    if (categoryMatches.length) {
      return {
        reply: `Yeh ${categoryHint.category.toLowerCase()} products aapke request se best match karte hain.`,
        needsClarification: false,
        products: categoryMatches,
      };
    }

    return {
      reply: filterSummary
        ? `Classy Store par abhi ${filterSummary} ke hisaab se koi ${categoryHint.category.toLowerCase()} product available nahi mila.`
        : `Classy Store par abhi ${categoryHint.category.toLowerCase()} category me koi matching product available nahi mila.`,
      needsClarification: false,
      products: [],
    };
  }

  if (candidates.length) {
    return {
      reply:
        "Maine aapke query ke hisaab se closest relevant products nikale hain.",
      needsClarification: false,
      products: candidates.slice(0, 3),
    };
  }

  return null;
};

const buildFallbackReply = ({
  message,
  catalog,
  candidates,
  filters,
  exactMatches,
  relaxedMatches,
  taxonomyIntent,
  userContext,
}) => {
  const normalizedMessage = normalize(message);

  if (!normalizedMessage) {
    return {
      reply:
        "Main products, orders, cart, wishlist, theme, settings, delivery, payment aur website help me assist kar sakta hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (isGreetingMessage(normalizedMessage)) {
    return {
      reply:
        "Hi, main aapka Classy Store assistant hoon. Products, filters, orders, theme, cart, wishlist, policies aur website navigation me help kar sakta hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (isUnsupportedQuery(normalizedMessage)) {
    return {
      reply:
        "Thank you for your query. Yeh service abhi Classy Store website par available nahi hai. Main shopping, orders, account, policies aur website-related help me assist kar sakta hoon.",
      needsClarification: false,
      products: [],
    };
  }

  const accountReply = buildAccountAwareReply({ message, userContext });
  if (accountReply) {
    return accountReply;
  }

  const knowledgeReply = findKnowledgeReply(normalizedMessage);
  if (knowledgeReply) {
    return {
      reply: knowledgeReply.reply,
      needsClarification: false,
      products: [],
    };
  }

  const shoppingReply = buildShoppingReply({
    message,
    catalog,
    candidates,
    filters,
    exactMatches,
    relaxedMatches,
    taxonomyIntent,
  });
  if (shoppingReply) {
    return shoppingReply;
  }

  return {
    ...buildContextualUnavailableReply({
      message,
      catalog,
      filters,
    }),
  };
};

const buildDeterministicCatalogReply = ({
  message,
  catalog,
  candidates,
  filters,
  exactMatches,
  relaxedMatches,
  taxonomyIntent,
  userContext,
}) => {
  const normalizedMessage = normalize(message);

  if (isGreetingMessage(normalizedMessage)) {
    return {
      reply:
        "Hi, main aapka Classy Store assistant hoon. Shopping, filters, orders, theme, cart, wishlist aur website help sab me assist kar sakta hoon.",
      needsClarification: false,
      products: [],
    };
  }

  if (isUnsupportedQuery(normalizedMessage)) {
    return {
      reply:
        "Thank you for your query. Yeh service abhi Classy Store website par available nahi hai. Main sirf website aur store-related help de sakta hoon.",
      needsClarification: false,
      products: [],
    };
  }

  const accountReply = buildAccountAwareReply({ message, userContext });
  if (accountReply) {
    return accountReply;
  }

  const knowledgeReply = findKnowledgeReply(normalizedMessage);
  if (knowledgeReply) {
    return {
      reply: knowledgeReply.reply,
      needsClarification: false,
      products: [],
    };
  }

  const shoppingReply = buildShoppingReply({
    message,
    catalog,
    candidates,
    filters,
    exactMatches,
    relaxedMatches,
    taxonomyIntent,
  });
  if (shoppingReply) {
    return shoppingReply;
  }

  const brandIntent = isShoppingQuery(message)
    ? detectBrandIntent(catalog, message)
    : null;

  if (brandIntent && candidates.length) {
    return {
      reply: `Maine ${brandIntent} brand ke relevant products aapke request ke liye nikale hain.`,
      needsClarification: false,
      products: candidates.slice(0, 3),
    };
  }

  const shortQueryTokens = getUniqueTokens(normalizedMessage);
  const isDirectProductLookup =
    shortQueryTokens.length <= 4 &&
    candidates.length > 0 &&
    candidates[0].aiCandidateScore >= 18;

  if (isDirectProductLookup) {
    return {
      reply: "Yeh aapke request ke closest matching products hain.",
      needsClarification: false,
      products: candidates.slice(0, 3),
    };
  }

  return null;
};

export const loadCatalogForAi = async () => {
  const sourceResults = await Promise.all(
    PRODUCT_SOURCES.map(async ({ label, routePrefix, detailPath, model }) => {
      const products = await model
        .find()
        .select(
          "name brand rating originalPrice discountedPrice inStock description category subCategory thirdLevelCategory",
        )
        .lean();

      return products.map((product) => ({
        ...product,
        _id: String(product._id),
        sourceLabel: label,
        routePrefix,
        detailPath,
      }));
    }),
  );

  return sourceResults.flat();
};

export const generateAiCatalogReply = async ({
  message,
  messages = [],
  signal,
  userId,
}) => {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured");
  }

  const [catalog, userContext] = await Promise.all([
    loadCatalogForAi(),
    loadAiUserContext(userId),
  ]);
  const { candidates, filters, exactMatches, relaxedMatches } =
    getShoppingSearchContext(catalog, message);
  const candidateIdSet = new Set(candidates.map((item) => String(item._id)));
  const prompt = buildPromptContext({
    message,
    messages,
    candidates,
    filters,
    userContext,
  });
  const productMap = new Map(
    candidates.map((item) => [String(item._id), item]),
  );
  // Strong direct matches are handled before calling the external model so the
  // assistant stays fast, cheaper, and more predictable for common queries.
  const deterministicReply = buildDeterministicCatalogReply({
    message,
    catalog,
    candidates,
    filters,
    exactMatches,
    relaxedMatches,
    userContext,
  });

  if (deterministicReply) {
    return deterministicReply;
  }

  try {
    const response = await fetch(process.env.AI_API_URL || DEFAULT_AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        "HTTP-Referer": process.env.USER_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "Classy Store AI Support",
      },
      signal,
      body: JSON.stringify({
        model: process.env.AI_CHAT_MODEL || "stepfun/step-3.5-flash:free",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: {
          type: "json_object",
        },
        // Low temperature helps keep product ids stable and reduces random
        // suggestions outside the grounded candidate set.
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "AI provider request failed");
    }

    const payload = await response.json();
    const rawText = getResponseText(payload);
    const parsed = extractJsonObject(rawText);
    const validIds = (parsed?.productIds || [])
      .map((id) => String(id))
      .filter((id) => candidateIdSet.has(id))
      .slice(0, 3);

    return {
      reply:
        parsed?.reply ||
        "How can I help you today with Classy Store products or support?",
      needsClarification: Boolean(parsed?.needsClarification),
      products: validIds.map((id) => productMap.get(id)).filter(Boolean),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    console.error("AI provider failed, using catalog fallback:", error.message);
    // If the provider is down or rate-limited, the chatbot still returns a
    // grounded answer instead of surfacing a dead generic error to users.
    return buildFallbackReply({
      message,
      catalog,
      candidates,
      filters,
      exactMatches,
      relaxedMatches,
      userContext,
    });
  }
};

export async function* generateAiCatalogReplyStream({
  message,
  messages = [],
  signal,
  userId,
}) {
  throwIfAborted(signal);
  const reply = await generateAiCatalogReply({
    message,
    messages,
    signal,
    userId,
  });

  throwIfAborted(signal);

  for await (const chunk of streamLocalReply(reply.reply, signal)) {
    yield { type: "chunk", chunk };
  }

  yield { type: "done", reply };
}
