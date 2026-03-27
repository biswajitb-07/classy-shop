import Bag from "../models/vendor/bag/bag.model.js";
import Beauty from "../models/vendor/beauty/beauty.model.js";
import Electronic from "../models/vendor/electronic/electronic.model.js";
import Fashion from "../models/vendor/fashion/fashion.model.js";
import Footwear from "../models/vendor/footwear/footwear.model.js";
import Grocery from "../models/vendor/grocery/grocery.model.js";
import Jewellery from "../models/vendor/jewellery/jewellery.model.js";
import Wellness from "../models/vendor/wellness/wellness.model.js";

const DEFAULT_AI_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Each source describes how a Mongo model maps into a storefront detail URL.
// The AI service uses this shared metadata to build one combined catalog.
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

const SYSTEM_PROMPT = `You are the AI assistant for Classy Store, a multi-category e-commerce platform.

Your role:
- Help users with products, support-related questions, order guidance, cart, wishlist, payment, delivery, and navigation.
- Answer professionally and briefly.
- Recommend only products that actually exist in the provided catalog context.
- Never invent products, services, brands, categories, stock, or order details.
- If the user asks for something not available on Classy Store, say so politely.
- If there are no relevant products in the provided context, do not recommend random items.
- If a query is nonsense, unclear, or too ambiguous, ask a short clarifying question instead of guessing.

Supported categories on Classy Store:
- electronics
- fashion
- beauty
- wellness
- grocery
- footwear
- jewellery
- bags

Return strict JSON only with this shape:
{
  "reply": "short helpful response",
  "productIds": ["id1", "id2"],
  "needsClarification": false
}

Rules for JSON:
- "productIds" must contain only IDs from the provided catalog context.
- Use an empty array if no product should be recommended.
- Keep productIds to at most 3 items.
- Set "needsClarification" to true when the query is too unclear or unsupported for a confident answer.`;

// Lightweight normalization makes retrieval resilient to casing, punctuation,
// and small formatting differences between query text and catalog text.
const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text) =>
  normalize(text)
    .split(" ")
    .filter((token) => token.length > 2);

const getUniqueTokens = (text) => [...new Set(tokenize(text))];

const levenshteinDistance = (left, right) => {
  const a = String(left || "");
  const b = String(right || "");

  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let row = 0; row <= a.length; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col <= b.length; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let col = 1; col <= b.length; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
};

const isCloseTokenMatch = (token, candidateToken) => {
  if (!token || !candidateToken) return false;
  if (token === candidateToken) return true;
  if (token.length <= 3 || candidateToken.length <= 3) return false;

  const distance = levenshteinDistance(token, candidateToken);
  const maxAllowedDistance = Math.max(1, Math.floor(Math.max(token.length, candidateToken.length) / 5));
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

const getKnownBrands = (catalog) =>
  [...new Set(catalog.map((product) => normalize(product.brand)).filter(Boolean))];

const detectBrandIntent = (catalog, query) => {
  const queryTokens = getUniqueTokens(query);
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
      queryTokens.some((queryToken) => isCloseTokenMatch(queryToken, brandToken)),
    ).length;

    const score = exactHits * 3 + fuzzyHits;
    if (!score) return;

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
    const hasThirdLevelExactMatch = hasWholeToken(productThirdLevelCategory, token);
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

const pickCatalogCandidates = (catalog, query) => {
  const brandIntent = detectBrandIntent(catalog, query);
  // When the query clearly points to a brand, we scope results first so the
  // fallback layer cannot leak unrelated products from other brands.
  const scopedCatalog = brandIntent
    ? catalog.filter((product) => normalize(product.brand) === brandIntent)
    : catalog;

  const scored = scopedCatalog
    .map((product) => ({
      ...product,
      aiCandidateScore: getCandidateScore(product, query),
    }))
    .filter((product) => product.aiCandidateScore > 0)
    .sort((a, b) => b.aiCandidateScore - a.aiCandidateScore)
    .slice(0, 24);

  const normalizedQuery = normalize(query);
  const strictBrandMatches = brandIntent
    ? scored.filter((product) => normalize(product.brand) === brandIntent)
    : scored;

  const exactNameOrBrandMatches = strictBrandMatches.filter(
    (product) =>
      hasWholeToken(product.name, normalizedQuery) ||
      hasWholeToken(product.brand, normalizedQuery) ||
      getUniqueTokens(normalizedQuery).some((token) => hasWholeToken(product.name, token)),
  );

  const finalCandidates = exactNameOrBrandMatches.length
    ? exactNameOrBrandMatches
    : strictBrandMatches;

  return finalCandidates.map(
    ({
      _id,
      name,
      brand,
      sourceLabel,
      category,
      subCategory,
      thirdLevelCategory,
      discountedPrice,
      originalPrice,
      inStock,
      description,
      routePrefix,
      detailPath,
    }) => ({
      _id,
      name,
      brand,
      sourceLabel,
      category,
      subCategory,
      thirdLevelCategory,
      discountedPrice,
      originalPrice,
      inStock,
      routePrefix,
      detailPath,
      description: String(description || "").slice(0, 220),
    }),
  );
};

const extractJsonObject = (text) => {
  const match = String(text || "").match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(match[0]);
};

const getResponseText = (payload) =>
  String(
    payload?.choices?.[0]?.message?.content ||
      payload?.output_text ||
      "",
  );

const mapMessagesToPrompt = (messages = []) =>
  messages
    .slice(-6)
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");

const hasWholeTerm = (text, term) =>
  new RegExp(
    `(^|[^a-z0-9])${String(term || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`,
  ).test(normalize(text));

const CATEGORY_HINTS = [
  { category: "Grocery", terms: ["vegetable", "vegetables", "fruit", "fruits", "grocery", "groceries", "rice", "snack"] },
  { category: "Electronics", terms: ["electronics", "electronic", "phone", "mobile", "laptop", "camera", "headphone", "earbuds"] },
  { category: "Fashion", terms: ["fashion", "dress", "shirt", "jeans", "kurta", "jacket", "tshirt"] },
  { category: "Footwear", terms: ["shoe", "shoes", "footwear", "sneaker", "sandals", "heels"] },
  { category: "Beauty", terms: ["beauty", "makeup", "skincare", "cosmetic", "serum", "cleanser"] },
  { category: "Wellness", terms: ["wellness", "protein", "supplement", "vitamin", "health"] },
  { category: "Bag", terms: ["bag", "backpack", "purse", "wallet"] },
  { category: "Jewellery", terms: ["jewellery", "jewelry", "ring", "necklace", "chain", "bracelet", "earring"] },
];

const KNOWLEDGE_REPLIES = [
  {
    terms: ["terms", "terms and conditions", "conditions", "rules"],
    reply:
      "Classy Store terms explain platform usage, order handling, pricing changes, product availability, and account responsibilities. You can read the full Terms And Conditions page from the website footer or information section.",
  },
  {
    terms: ["legal", "legal notice", "policy", "policies"],
    reply:
      "Classy Store legal and policy pages explain account responsibilities, content ownership, safe usage, and platform rules. You can open the Legal Notice page for the full details.",
  },
  {
    terms: ["delivery", "shipping", "shipment"],
    reply:
      "Orders are usually processed within 24 to 48 hours, and delivery timing depends on stock, category, and location. You can track the latest status from your order history page.",
  },
  {
    terms: ["payment", "secure payment", "cod", "cash on delivery"],
    reply:
      "Classy Store supports secure checkout flows. Please verify payment method, amount, and address before placing the order, and check your order history after payment.",
  },
  {
    terms: ["about us", "about classy store", "about classyshop", "company"],
    reply:
      "Classy Store is a multi-category ecommerce platform for electronics, fashion, beauty, wellness, grocery, footwear, jewellery, and bags, with shopping and vendor support in one platform.",
  },
  {
    terms: ["wishlist"],
    reply:
      "You can save products to your wishlist from product cards and product detail pages, then review them later from the wishlist section of your account.",
  },
  {
    terms: ["cart"],
    reply:
      "You can add items to your cart from product cards or detail pages, adjust quantity in the cart, and continue to checkout when you are ready.",
  },
  {
    terms: ["support", "help"],
    reply:
      "I can help with product search, delivery, payment, cart, wishlist, order guidance, and website information related to Classy Store.",
  },
];

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
  CATEGORY_HINTS.find(({ terms }) => terms.some((term) => hasWholeTerm(text, term)));

const findKnowledgeReply = (text) =>
  KNOWLEDGE_REPLIES.find(({ terms }) => terms.some((term) => hasWholeTerm(text, term)));

const isUnsupportedQuery = (text) =>
  UNSUPPORTED_TERMS.some((term) => hasWholeTerm(text, term));

const buildFallbackReply = ({ message, catalog, candidates }) => {
  const normalizedMessage = normalize(message);

  if (!normalizedMessage) {
    return {
      reply:
        "How can I help you today? You can ask about products, categories, delivery, payment, or order help on Classy Store.",
      needsClarification: false,
      products: [],
    };
  }

  if (isGreetingMessage(normalizedMessage)) {
    return {
      reply:
        "Hi, I am your Classy Store shopping assistant. Ask me about products, categories, delivery, payment, or order help.",
      needsClarification: false,
      products: [],
    };
  }

  if (hasWholeTerm(normalizedMessage, "order") || hasWholeTerm(normalizedMessage, "track")) {
    return {
      reply:
        "For order updates, please open your order history page. You can check pending, processing, shipped, out for delivery, delivered, or cancelled status there.",
      needsClarification: false,
      products: [],
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

  if (isUnsupportedQuery(normalizedMessage)) {
    return {
      reply:
        "Thank you for your query. Currently, Classy Store only supports shopping and website help related to our available categories and platform features. I cannot help with that service here.",
      needsClarification: false,
      products: [],
    };
  }

  const categoryHint = findCategoryHint(normalizedMessage);
  if (categoryHint) {
    // Category fallback is useful when the external model is unavailable but
    // the query still clearly points to one of the storefront departments.
    const categoryMatches = catalog
      .filter(
        (item) => normalize(item.sourceLabel || item.category) === normalize(categoryHint.category),
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
        reply: `Here are some ${categoryHint.category.toLowerCase()} products that match your request on Classy Store.`,
        needsClarification: false,
        products: categoryMatches,
      };
    }

    return {
      reply: `I could not find matching ${categoryHint.category.toLowerCase()} products on Classy Store right now. You can try another keyword, brand, or product type.`,
      needsClarification: false,
      products: [],
    };
  }

  if (candidates.length) {
    return {
      reply: "I found these products based on your product, brand, or category query.",
      needsClarification: false,
      products: candidates.slice(0, 3),
    };
  }

  return {
    reply:
      "I could not find a confident product match for that request. Please try a clearer product name, brand, or category from Classy Store.",
    needsClarification: true,
    products: [],
  };
};

const buildDeterministicCatalogReply = ({ message, catalog, candidates }) => {
  const normalizedMessage = normalize(message);
  const brandIntent = detectBrandIntent(catalog, message);

  if (brandIntent && candidates.length) {
    return {
      reply: `Here are the ${brandIntent} products I found on Classy Store for your request.`,
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
      reply: "Here are the closest matching products I found on Classy Store.",
      needsClarification: false,
      products: candidates.slice(0, 3),
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

  if (isUnsupportedQuery(normalizedMessage)) {
    return {
      reply:
        "Thank you for your query. Currently, Classy Store only supports shopping and website help related to our available categories and platform features. I cannot help with that service here.",
      needsClarification: false,
      products: [],
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
}) => {
  if (!process.env.AI_API_KEY) {
    throw new Error("AI_API_KEY is not configured");
  }

  const catalog = await loadCatalogForAi();
  const candidates = pickCatalogCandidates(catalog, message);
  const candidateIdSet = new Set(candidates.map((item) => String(item._id)));

  const prompt = [
    "Conversation history:",
    mapMessagesToPrompt(messages) || "No previous messages.",
    "",
    `Current user message: ${message}`,
    "",
    "Available product catalog candidates:",
    candidates.length ? JSON.stringify(candidates, null, 2) : "[]",
    "",
    "If the candidate list is empty or does not contain relevant items, answer without product recommendations.",
  ].join("\n");
  const productMap = new Map(candidates.map((item) => [String(item._id), item]));
  // Strong direct matches are handled before calling the external model so the
  // assistant stays fast, cheaper, and more predictable for common queries.
  const deterministicReply = buildDeterministicCatalogReply({
    message,
    catalog,
    candidates,
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
    console.error("AI provider failed, using catalog fallback:", error.message);
    // If the provider is down or rate-limited, the chatbot still returns a
    // grounded answer instead of surfacing a dead generic error to users.
    return buildFallbackReply({
      message,
      catalog,
      candidates,
    });
  }
};
