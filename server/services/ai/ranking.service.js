import { computePersonalizationBreakdown } from "./personalization.service.js";

const getDisplayPrice = (product) =>
  Number(product.discountedPrice || product.originalPrice || 0);

const getDiscountPercent = (product) => {
  const originalPrice = Number(product.originalPrice || 0);
  const discountedPrice = Number(product.discountedPrice || 0);

  if (!originalPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

export const applyPersonalizedRanking = ({
  products = [],
  userMemory = null,
  budgetPreference = false,
  relaxed = false,
}) =>
  products
    .map((product) => {
      const { personalizationScore, behaviorScore } =
        computePersonalizationBreakdown(product, userMemory);
      const aiCandidateScore = Number(product.aiCandidateScore || 0);

      return {
        ...product,
        personalizationScore,
        behaviorScore,
        finalScore: aiCandidateScore + personalizationScore + behaviorScore,
      };
    })
    .sort((left, right) => {
      if (budgetPreference && getDisplayPrice(left) !== getDisplayPrice(right)) {
        return getDisplayPrice(left) - getDisplayPrice(right);
      }

      if (Number(right.finalScore || 0) !== Number(left.finalScore || 0)) {
        return Number(right.finalScore || 0) - Number(left.finalScore || 0);
      }

      if (relaxed && Number(right.matchedRules || 0) !== Number(left.matchedRules || 0)) {
        return Number(right.matchedRules || 0) - Number(left.matchedRules || 0);
      }

      return (
        getDiscountPercent(right) - getDiscountPercent(left) ||
        Number(right.rating || 0) - Number(left.rating || 0)
      );
    });
