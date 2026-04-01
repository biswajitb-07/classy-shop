import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { X } from "lucide-react";
import { RiSparklingFill } from "react-icons/ri";
import { buildProductPath } from "../../utils/aiShopping.js";
import {
  AI_BEHAVIOR_UPDATED_EVENT,
  buildAiBehaviorProductPayload,
  trackAiBehavior,
} from "../../utils/aiBehavior.js";

const AI_RECOMMENDATION_URL = `${import.meta.env.VITE_API_URL}/api/v1/product/ai-chat/recommendations`;
const AI_RECOMMENDATION_LOGIN_OPEN_KEY = "ai-recommendation-open-after-login";

const getProductDiscountPercent = (product) => {
  const originalPrice = Number(product?.originalPrice || 0);
  const discountedPrice = Number(product?.discountedPrice || 0);

  if (!originalPrice || discountedPrice >= originalPrice) {
    return 0;
  }

  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

const getProductImageSrc = (product) =>
  Array.isArray(product?.image) ? product.image[0] || "" : product?.image || "";

const AIRecommendationDialog = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hadRecommendationProductsRef = useRef(false);
  const [recommendation, setRecommendation] = useState({
    shouldShow: false,
    reply: "",
    products: [],
  });

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      setIsOpen(false);
      hadRecommendationProductsRef.current = false;
      setRecommendation({
        shouldShow: false,
        reply: "",
        products: [],
      });
      return undefined;
    }

    let isMounted = true;
    const shouldOpenAfterLogin =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(AI_RECOMMENDATION_LOGIN_OPEN_KEY) === "1";

    const loadRecommendation = ({ shouldAutoOpen = false } = {}) => {
      setIsLoading(true);

      fetch(AI_RECOMMENDATION_URL, {
        method: "GET",
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to load AI recommendations");
          }
          return response.json();
        })
        .then((payload) => {
          if (!isMounted) return;
          const nextRecommendation = payload?.recommendation || {
            shouldShow: false,
            reply: "",
            products: [],
          };
          const hadProducts = hadRecommendationProductsRef.current;
          const hasProducts = Boolean(
            nextRecommendation.shouldShow && nextRecommendation.products?.length,
          );

          hadRecommendationProductsRef.current = hasProducts;
          setRecommendation(nextRecommendation);
          setIsOpen((currentOpen) => {
            if (!hasProducts) {
              return false;
            }

            if (shouldAutoOpen) {
              if (typeof window !== "undefined") {
                window.sessionStorage.removeItem(AI_RECOMMENDATION_LOGIN_OPEN_KEY);
              }
              return true;
            }

            return currentOpen;
          });
        })
        .catch(() => {
          if (!isMounted) return;
          hadRecommendationProductsRef.current = false;
          setRecommendation({
            shouldShow: false,
            reply: "",
            products: [],
          });
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    };

    loadRecommendation({
      shouldAutoOpen: shouldOpenAfterLogin,
    });
    const handleBehaviorUpdated = () => loadRecommendation();
    window.addEventListener(AI_BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener(AI_BEHAVIOR_UPDATED_EVENT, handleBehaviorUpdated);
    };
  }, [isAuthenticated, user?._id]);

  const handleClose = () => {
    setIsOpen(false);
  };

  if (
    !isAuthenticated ||
    !user?._id ||
    (!recommendation.products?.length && isLoading) ||
    !recommendation.products?.length
  ) {
    return null;
  }

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-3 py-4 sm:px-4">
          <div className="max-h-[min(88vh,46rem)] w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.28)] lg:max-w-2xl">
            <div className="flex items-start justify-between gap-4 rounded-t-[28px] bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 px-5 py-4 text-white">
              <div>
                <p className="text-sm font-bold">Recommended For You</p>
                <p className="mt-1 text-xs leading-5 text-white/90">
                  {recommendation.reply || "Aapki recent AI activity ke basis par yeh products suggest kiye gaye hain."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              >
                <X size={16} />
              </button>
            </div>

            <div className="themed-scrollbar max-h-[min(65vh,34rem)] space-y-3 overflow-y-auto px-4 py-4 lg:grid lg:grid-cols-1 lg:gap-4 lg:px-5 lg:py-5">
              {recommendation.products.map((product) => (
                <Link
                  key={product._id}
                  to={buildProductPath(product)}
                  onClick={() => {
                    trackAiBehavior({
                      eventType: "product_click",
                      product: buildAiBehaviorProductPayload(product),
                    });
                    handleClose();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-orange-300 hover:bg-orange-50 lg:gap-4 lg:px-5 lg:py-4"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white lg:h-24 lg:w-24">
                    {getProductImageSrc(product) ? (
                      <img
                        src={getProductImageSrc(product)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-orange-100 via-rose-100 to-red-100 text-[10px] font-bold text-orange-600">
                        AI PICK
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-slate-900 lg:text-base">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.brand || product.sourceLabel || product.category}
                    </p>
                    <p className="mt-2 text-xs text-slate-600">
                      {product.discountedPrice || product.originalPrice
                        ? `Rs ${Number(
                            product.discountedPrice || product.originalPrice || 0,
                          ).toLocaleString("en-IN")}`
                        : "Price unavailable"}
                      {getProductDiscountPercent(product)
                        ? ` • ${getProductDiscountPercent(product)}% off`
                        : ""}
                      {product.rating ? ` • ${product.rating} rating` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-[14rem] right-3 z-40 md:right-4 lg:bottom-[9.5rem] lg:right-5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 via-rose-500 to-red-500 text-white shadow-[0_14px_40px_rgba(244,63,94,0.28)] transition hover:-translate-y-1 hover:scale-105"
            aria-label="Open recommended products"
          >
            <RiSparklingFill size={19} />
          </button>
        </div>
      )}
    </>
  );
};

export default AIRecommendationDialog;
