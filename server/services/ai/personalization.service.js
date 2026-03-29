const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getTopPreferenceValues = (entries = []) =>
  entries
    .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0))
    .slice(0, 5)
    .map((entry) => normalizeValue(entry.value))
    .filter(Boolean);

const getProductCategoryValues = (product) =>
  [
    product.sourceLabel,
    product.category,
    product.subCategory,
    product.thirdLevelCategory,
  ]
    .map(normalizeValue)
    .filter(Boolean);

const getProductBrandValue = (product) => normalizeValue(product.brand);

export const computePersonalizationBreakdown = (product, userMemory) => {
  if (!userMemory) {
    return {
      personalizationScore: 0,
      behaviorScore: 0,
    };
  }

  const preferredCategories = new Set(
    getTopPreferenceValues(userMemory.preferences?.categories || []),
  );
  const preferredBrands = new Set(
    getTopPreferenceValues(userMemory.preferences?.brands || []),
  );
  const viewedCategories = new Set(
    (userMemory.behaviorSignals?.viewedCategories || [])
      .map((entry) => normalizeValue(entry.value))
      .filter(Boolean),
  );
  const clickedProducts = userMemory.behaviorSignals?.clickedProducts || [];
  const productCategories = getProductCategoryValues(product);
  const productBrand = getProductBrandValue(product);

  let personalizationScore = 0;
  let behaviorScore = 0;

  if (productCategories.some((value) => preferredCategories.has(value))) {
    personalizationScore += 20;
  }

  if (productBrand && preferredBrands.has(productBrand)) {
    personalizationScore += 15;
  }

  if (productCategories.some((value) => viewedCategories.has(value))) {
    behaviorScore += 10;
  }

  const hasSimilarClickedProduct = clickedProducts.some((entry) => {
    const clickedBrand = normalizeValue(entry.brand);
    const clickedCategory = normalizeValue(entry.category);
    const clickedSubCategory = normalizeValue(entry.subCategory);
    const clickedThirdLevelCategory = normalizeValue(entry.thirdLevelCategory);

    return (
      String(entry.productId || "") === String(product._id || "") ||
      (clickedBrand && clickedBrand === productBrand) ||
      (clickedThirdLevelCategory &&
        productCategories.includes(clickedThirdLevelCategory)) ||
      (clickedSubCategory && productCategories.includes(clickedSubCategory)) ||
      (clickedCategory && productCategories.includes(clickedCategory))
    );
  });

  if (hasSimilarClickedProduct) {
    behaviorScore += 25;
  }

  return {
    personalizationScore,
    behaviorScore,
  };
};
