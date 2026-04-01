import { AiUserMemory } from "../../models/ai/aiUserMemory.model.js";

const MEMORY_LIST_LIMIT = 10;
const QUERY_HISTORY_LIMIT = 10;
const BEHAVIOR_SIGNALS_RESET_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

const normalizeMemoryValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const upsertWeightedPreference = (entries = [], rawValue, increment = 1) => {
  const value = normalizeMemoryValue(rawValue);
  if (!value) return entries;

  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex(
    (entry) => normalizeMemoryValue(entry.value) === value,
  );

  if (existingIndex >= 0) {
    nextEntries[existingIndex] = {
      ...nextEntries[existingIndex],
      weight: Number(nextEntries[existingIndex].weight || 0) + increment,
      lastSeenAt: new Date(),
    };
  } else {
    nextEntries.push({
      value,
      weight: increment,
      lastSeenAt: new Date(),
    });
  }

  return nextEntries
    .sort((left, right) => {
      if (Number(right.weight || 0) !== Number(left.weight || 0)) {
        return Number(right.weight || 0) - Number(left.weight || 0);
      }

      return new Date(right.lastSeenAt || 0) - new Date(left.lastSeenAt || 0);
    })
    .slice(0, MEMORY_LIST_LIMIT);
};

const pushRecentUniqueItem = (entries = [], nextEntry, matcher) => {
  const nextEntries = [...entries];
  const existingIndex = nextEntries.findIndex(matcher);

  if (existingIndex >= 0) {
    nextEntries.splice(existingIndex, 1);
  }

  nextEntries.unshift(nextEntry);
  return nextEntries.slice(0, MEMORY_LIST_LIMIT);
};

const getBudgetLevel = (filters = {}) => {
  if (filters.budgetPreference) return "low";
  if (filters.maxPrice !== null && filters.maxPrice <= 1000) return "low";
  if (filters.maxPrice !== null && filters.maxPrice <= 3000) return "medium";
  if (filters.minPrice !== null && filters.minPrice >= 3000) return "high";
  return "";
};

const getPriceRangeLabel = (filters = {}) => {
  if (filters.minPrice !== null && filters.maxPrice !== null) {
    return `${filters.minPrice}-${filters.maxPrice}`;
  }

  if (filters.maxPrice !== null) {
    return `under-${filters.maxPrice}`;
  }

  if (filters.minPrice !== null) {
    return `above-${filters.minPrice}`;
  }

  const budgetLevel = getBudgetLevel(filters);
  return budgetLevel ? `${budgetLevel}-budget` : "";
};

const createEmptyBehaviorSignals = () => ({
  clickedProducts: [],
  viewedCategories: [],
});

const isBehaviorSignalsExpired = (memory) => {
  const lastUpdatedAt = new Date(
    memory?.behaviorSignalsUpdatedAt || memory?.updatedAt || memory?.createdAt || 0,
  );

  if (Number.isNaN(lastUpdatedAt.getTime())) {
    return false;
  }

  return Date.now() - lastUpdatedAt.getTime() >= BEHAVIOR_SIGNALS_RESET_WINDOW_MS;
};

const resetBehaviorSignalsIfExpired = async (memory) => {
  if (!memory || !isBehaviorSignalsExpired(memory)) {
    return memory;
  }

  memory.behaviorSignals = createEmptyBehaviorSignals();
  memory.behaviorSignalsUpdatedAt = new Date();
  await memory.save();
  return memory;
};

const touchBehaviorSignals = (memory) => {
  memory.behaviorSignalsUpdatedAt = new Date();
};

export const getAiUserMemory = async (userId) => {
  if (!userId) return null;

  const memory = await AiUserMemory.findOne({ userId });
  if (!memory) return null;

  await resetBehaviorSignalsIfExpired(memory);
  return memory.toObject();
};

export const ensureAiUserMemory = async (userId) => {
  if (!userId) {
    return null;
  }

  const memory = await AiUserMemory.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        preferences: {
          categories: [],
          priceRanges: [],
          brands: [],
          budgetLevel: "",
        },
        recentQueries: [],
        behaviorSignals: {
          clickedProducts: [],
          viewedCategories: [],
        },
        behaviorSignalsUpdatedAt: new Date(),
        lastInteractionAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await resetBehaviorSignalsIfExpired(memory);
  return memory?.toObject?.() || memory;
};

export const updateAiUserMemoryFromChat = async ({
  userId,
  message,
  filters = {},
  brandIntent = null,
  taxonomyIntent = null,
  intent = "",
}) => {
  if (!userId || !String(message || "").trim()) {
    return null;
  }

  const memory =
    (await AiUserMemory.findOne({ userId })) ||
    new AiUserMemory({
      userId,
    });

  await resetBehaviorSignalsIfExpired(memory);

  const inferredCategory =
    filters.category ||
    taxonomyIntent?.rootCategory ||
    taxonomyIntent?.value ||
    "";
  const inferredBrand = brandIntent || "";
  const inferredPriceRange = getPriceRangeLabel(filters);
  const budgetLevel = getBudgetLevel(filters);

  if (inferredCategory) {
    memory.preferences.categories = upsertWeightedPreference(
      memory.preferences.categories,
      inferredCategory,
      1,
    );

    memory.behaviorSignals.viewedCategories = pushRecentUniqueItem(
      memory.behaviorSignals.viewedCategories,
      {
        value: inferredCategory,
        level: filters.category ? "category" : taxonomyIntent?.level || "category",
        viewedAt: new Date(),
      },
      (entry) =>
        normalizeMemoryValue(entry.value) === normalizeMemoryValue(inferredCategory),
    );
    touchBehaviorSignals(memory);
  }

  if (inferredBrand) {
    memory.preferences.brands = upsertWeightedPreference(
      memory.preferences.brands,
      inferredBrand,
      1,
    );
  }

  if (inferredPriceRange) {
    memory.preferences.priceRanges = upsertWeightedPreference(
      memory.preferences.priceRanges,
      inferredPriceRange,
      1,
    );
  }

  if (budgetLevel) {
    memory.preferences.budgetLevel = budgetLevel;
  }

  memory.recentQueries = [
    {
      message: String(message).trim(),
      intent,
      filters,
      createdAt: new Date(),
    },
    ...memory.recentQueries.filter(
      (entry) =>
        normalizeMemoryValue(entry.message) !== normalizeMemoryValue(message),
    ),
  ].slice(0, QUERY_HISTORY_LIMIT);

  memory.lastInteractionAt = new Date();
  await memory.save();
  return memory.toObject();
};

export const recordAiBehaviorEvent = async ({
  userId,
  eventType,
  product = null,
  category = "",
}) => {
  if (!userId || !eventType) {
    return null;
  }

  const memory =
    (await AiUserMemory.findOne({ userId })) ||
    new AiUserMemory({
      userId,
    });

  await resetBehaviorSignalsIfExpired(memory);

  if (eventType === "product_click" && product?._id) {
    memory.behaviorSignals.clickedProducts = pushRecentUniqueItem(
      memory.behaviorSignals.clickedProducts,
      {
        productId: String(product._id),
        name: product.name || "",
        brand: product.brand || "",
        category: product.sourceLabel || product.category || "",
        subCategory: product.subCategory || "",
        thirdLevelCategory: product.thirdLevelCategory || "",
        clickedAt: new Date(),
      },
      (entry) => String(entry.productId || "") === String(product._id),
    );

    if (product.sourceLabel || product.category) {
      memory.behaviorSignals.viewedCategories = pushRecentUniqueItem(
        memory.behaviorSignals.viewedCategories,
        {
          value: product.sourceLabel || product.category,
          level: "category",
          viewedAt: new Date(),
        },
        (entry) =>
          normalizeMemoryValue(entry.value) ===
          normalizeMemoryValue(product.sourceLabel || product.category),
      );
    }

    touchBehaviorSignals(memory);
  }

  if (eventType === "category_view" && category) {
    memory.behaviorSignals.viewedCategories = pushRecentUniqueItem(
      memory.behaviorSignals.viewedCategories,
      {
        value: category,
        level: "category",
        viewedAt: new Date(),
      },
      (entry) =>
        normalizeMemoryValue(entry.value) === normalizeMemoryValue(category),
    );
    touchBehaviorSignals(memory);
  }

  memory.lastInteractionAt = new Date();
  await memory.save();
  return memory.toObject();
};
