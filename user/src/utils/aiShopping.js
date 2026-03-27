// File guide: aiShopping source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
const VIEW_HISTORY_KEY = "classy-store-ai-view-history";

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const buildProductPath = (product) =>
  `/${product.routePrefix || product.category?.toLowerCase()}/${product.detailPath || `${product.category?.toLowerCase()}-product-details`}/${product._id}`;

export const recordProductView = (product) => {
  if (!product?._id) return;
  if (typeof window === "undefined") return;

  try {
    const existing = JSON.parse(localStorage.getItem(VIEW_HISTORY_KEY) || "[]");
    const nextEntry = {
      id: product._id,
      name: product.name,
      category: product.sourceLabel || product.category,
      brand: product.brand || "",
      subCategory: product.subCategory || "",
      thirdLevelCategory: product.thirdLevelCategory || "",
      viewedAt: Date.now(),
    };

    const merged = [
      nextEntry,
      ...existing.filter((entry) => entry.id !== product._id),
    ].slice(0, 24);

    localStorage.setItem(VIEW_HISTORY_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error("Failed to record AI view history", error);
  }
};

export const getProductViewHistory = () => {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(VIEW_HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

export const getPersonalizedRecommendations = (catalog, wishlist = []) => {
  const history = getProductViewHistory();
  const viewedIds = new Set(history.map((item) => item.id));
  const wishlistIds = new Set(
    wishlist.map((item) => item.productId || item._id).filter(Boolean),
  );

  const categoryWeights = history.reduce((acc, item, index) => {
    const recencyBoost = Math.max(1, 8 - index);
    const key = normalize(item.category);
    acc[key] = (acc[key] || 0) + recencyBoost;
    return acc;
  }, {});

  const brandWeights = history.reduce((acc, item, index) => {
    const key = normalize(item.brand);
    if (!key) return acc;
    acc[key] = (acc[key] || 0) + Math.max(1, 5 - index);
    return acc;
  }, {});

  return [...catalog]
    .map((product) => {
      const categoryKey = normalize(product.sourceLabel || product.category);
      const brandKey = normalize(product.brand);
      const discount =
        Number(product.originalPrice || 0) - Number(product.discountedPrice || 0);

      let score = Number(product.rating || 0) * 18;
      score += (categoryWeights[categoryKey] || 0) * 10;
      score += (brandWeights[brandKey] || 0) * 7;
      score += viewedIds.has(product._id) ? -20 : 0;
      score += wishlistIds.has(product._id) ? 32 : 0;
      score += discount > 0 ? Math.min(18, discount / 120) : 0;
      score += Number(product.inStock || 0) < 8 ? 8 : 0;

      return {
        ...product,
        aiScore: Math.round(score),
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 8);
};

export const getDemandPrediction = (catalog) => {
  const grouped = catalog.reduce((acc, product) => {
    const key = product.sourceLabel || product.category || "General";
    if (!acc[key]) {
      acc[key] = {
        category: key,
        items: 0,
        stock: 0,
        avgRating: 0,
        demandScore: 0,
      };
    }

    acc[key].items += 1;
    acc[key].stock += Number(product.inStock || 0);
    acc[key].avgRating += Number(product.rating || 0);
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => {
      const avgRating = item.items ? item.avgRating / item.items : 0;
      const scarcityBoost = item.stock < 40 ? 24 : item.stock < 80 ? 12 : 0;
      const demandScore = Math.min(
        100,
        Math.round(avgRating * 16 + item.items * 5 + scarcityBoost),
      );

      return {
        ...item,
        avgRating: Number(avgRating.toFixed(1)),
        demandScore,
        label:
          demandScore >= 78
            ? "Hot demand"
            : demandScore >= 58
              ? "Growing"
              : "Steady",
      };
    })
    .sort((a, b) => b.demandScore - a.demandScore)
    .slice(0, 6);
};

export const getSalesForecast = (catalog) => {
  const history = getProductViewHistory();
  const favoriteCategory = history[0]?.category || catalog[0]?.sourceLabel || "Fashion";

  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => {
    const base = 18 + index * 4;
    const signal = favoriteCategory.length * 1.4;
    const inventorySignal = Math.min(
      36,
      catalog.reduce((sum, item) => sum + Number(item.inStock || 0), 0) / 80,
    );
    const forecast = Math.round(base + signal + inventorySignal + (index % 2 === 0 ? 10 : 4));

    return {
      day,
      forecast,
    };
  });
};

export const getFraudSignals = (catalog) => {
  const suspicious = catalog
    .map((product) => {
      const original = Number(product.originalPrice || 0);
      const discounted = Number(product.discountedPrice || 0);
      const discountRatio = original > 0 ? (original - discounted) / original : 0;
      const risk =
        (discountRatio > 0.72 ? 48 : 0) +
        (Number(product.rating || 0) < 2.5 ? 22 : 0) +
        (Number(product.inStock || 0) === 0 ? 12 : 0) +
        (!product.description ? 14 : 0);

      return {
        ...product,
        trustScore: Math.max(18, 100 - risk),
      };
    })
    .sort((a, b) => a.trustScore - b.trustScore)
    .slice(0, 4);

  return suspicious;
};

export const getSentimentInsights = (catalog) =>
  catalog
    .slice(0, 8)
    .map((product) => {
      const rating = Number(product.rating || 0);
      const sentiment =
        rating >= 4.4 ? "Positive" : rating >= 3.4 ? "Mixed" : "Needs attention";

      return {
        ...product,
        sentiment,
        sentimentScore: Math.max(24, Math.round(rating * 20)),
      };
    })
    .sort((a, b) => b.sentimentScore - a.sentimentScore)
    .slice(0, 5);
