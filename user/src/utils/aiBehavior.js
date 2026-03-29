export const AI_BEHAVIOR_URL = `${import.meta.env.VITE_API_URL}/api/v1/product/ai-chat/behavior`;
export const AI_BEHAVIOR_UPDATED_EVENT = "ai-behavior-updated";

export const buildAiBehaviorProductPayload = (product) => {
  if (!product?._id) {
    return null;
  }

  return {
    _id: product._id,
    name: product.name,
    brand: product.brand,
    sourceLabel: product.sourceLabel,
    category: product.category,
    subCategory: product.subCategory,
    thirdLevelCategory: product.thirdLevelCategory,
  };
};

export const trackAiBehavior = ({ eventType, product = null, category = "" }) => {
  fetch(AI_BEHAVIOR_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    keepalive: true,
    body: JSON.stringify({
      eventType,
      product,
      category,
    }),
  })
    .then((response) => {
      if (!response.ok || typeof window === "undefined") {
        return;
      }

      window.dispatchEvent(new CustomEvent(AI_BEHAVIOR_UPDATED_EVENT));
    })
    .catch(() => {});
};
