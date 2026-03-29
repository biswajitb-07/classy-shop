import { useEffect, useRef } from "react";
import {
  buildAiBehaviorProductPayload,
  trackAiBehavior,
} from "../utils/aiBehavior.js";

const useTrackAiProductClick = (product) => {
  const lastTrackedProductIdRef = useRef("");

  useEffect(() => {
    if (!product?._id) {
      return;
    }

    const nextProductId = String(product._id);
    if (lastTrackedProductIdRef.current === nextProductId) {
      return;
    }

    lastTrackedProductIdRef.current = nextProductId;
    trackAiBehavior({
      eventType: "product_click",
      product: buildAiBehaviorProductPayload(product),
    });
  }, [
    product?._id,
    product?.name,
    product?.brand,
    product?.sourceLabel,
    product?.category,
    product?.subCategory,
    product?.thirdLevelCategory,
  ]);
};

export default useTrackAiProductClick;
