// File guide: SearchResultsPage source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowRight, FaRegStar, FaStar, FaStarHalfAlt, FaLink } from "react-icons/fa";
import toast from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useMarketplaceSearch } from "../../components/search/useMarketplaceSearch.js";

const SearchResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  const query = searchParams.get("q") || "";

  const { matchedProducts, isLoading, getProductPath } =
    useMarketplaceSearch(query);

  const results = useMemo(() => matchedProducts, [matchedProducts]);
  const hasQuery = Boolean(query.trim());

  const bgClass = isDark
    ? "bg-slate-950 text-slate-100"
    : "bg-gradient-to-br from-gray-50 to-gray-100 text-slate-900";
  const panelClass = isDark
    ? "bg-slate-900 border border-slate-700"
    : "bg-white border border-slate-100";
  const headingClass = isDark ? "text-white" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-300" : "text-slate-600";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";

  const renderStars = (rating) => {
    const val = rating ? Math.round(rating * 2) / 2 : 0;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, index) => {
          const starIndex = index + 1;
          if (starIndex <= val) {
            return <FaStar key={starIndex} className="text-yellow-500" />;
          }
          if (starIndex - 0.5 === val) {
            return <FaStarHalfAlt key={starIndex} className="text-yellow-500" />;
          }
          return <FaRegStar key={starIndex} className={isDark ? "text-slate-500" : "text-slate-300"} />;
        })}
      </div>
    );
  };

  const getPriceInfo = (product) => {
    const salePrice = product.discountedPrice ?? product.salePrice ?? product.price ?? 0;
    const originalPrice = product.originalPrice ?? product.price ?? null;
    return { salePrice, originalPrice };
  };

  const openProduct = (product) => {
    navigate(getProductPath(product, query), {
      state: { fromSearch: true, query },
    });
  };

  const copyProductLink = async (product) => {
    const link = `${window.location.origin}${getProductPath(product, query)}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Product link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className={`min-h-screen pb-16 ${bgClass}`}>
      <div className="container mx-auto px-4 pt-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className={`text-xs uppercase tracking-[0.25em] ${bodyClass}`}>
              Marketplace search
            </p>
            <h1 className={`text-2xl md:text-4xl font-bold ${headingClass} mt-2`}>
              {hasQuery ? `Results for "${query}"` : "Search products"}
            </h1>
            <p className={`mt-2 ${bodyClass}`}>
              {isLoading
                ? "Loading products..."
                : `${results.length} products matched your search`}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
          >
            Back
          </button>
        </div>

        {!hasQuery && (
          <div className={`mb-6 rounded-2xl p-4 ${panelClass}`}>
            <p className={bodyClass}>
              Start typing in the search bar to find products across fashion,
              electronics, bags, beauty, grocery, jewellery, footwear, and wellness.
            </p>
          </div>
        )}

        {hasQuery && (
          <div className={`mb-6 rounded-2xl p-4 ${panelClass}`}>
            <p className={bodyClass}>
              Showing products that match <span className={headingClass}>"{query}"</span>.
            </p>
          </div>
        )}

        {hasQuery ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {results.map((product) => {
              const { salePrice, originalPrice } = getPriceInfo(product);
              const isFeatured = product.rating && product.rating >= 4.5;
              const image = product.image?.[0] || product.image || "/fallback-image.jpg";

              return (
                <div
                  key={`${product.sourceLabel}-${product._id}`}
                  onClick={() => openProduct(product)}
                  className={`group relative cursor-pointer rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${panelClass}`}
                >
                  <div className={`aspect-[4/3] overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                    <img
                      src={image}
                      alt={product.name}
                      className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-rose-300" : "text-red-500"}`}>
                          {product.sourceLabel}
                        </p>
                        <h3 className={`mt-1 text-base font-bold line-clamp-2 ${headingClass}`}>
                          {product.name}
                        </h3>
                      </div>
                      {isFeatured && (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-400">
                          Top rated
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center gap-2 text-sm ${mutedClass}`}>
                      <span>{product.category || product.productType || product.sourceLabel}</span>
                      <span>•</span>
                      <span>{product.brand || "No brand"}</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {renderStars(product.rating)}
                        <span className={`text-xs font-semibold ${mutedClass}`}>
                          {typeof product.rating === "number" ? product.rating.toFixed(1) : "0.0"}
                        </span>
                      </div>
                      <div className="text-right">
                        {originalPrice && originalPrice !== salePrice && (
                          <p className={`text-xs line-through ${mutedClass}`}>
                            ₹{Number(originalPrice).toLocaleString()}
                          </p>
                        )}
                        <p className="text-lg font-bold text-red-500">
                          ₹{Number(salePrice).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <p className={`text-sm leading-6 line-clamp-3 ${bodyClass}`}>
                      {product.description ||
                        `${product.name} from ${product.sourceLabel} is available to explore in search results.`}
                    </p>

                    <div className={`flex items-center justify-between text-xs ${mutedClass}`}>
                      <span>Stock: {product.inStock ?? "N/A"}</span>
                      {product.sizes?.length > 0 && <span>Sizes available</span>}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
                      >
                        Open product
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyProductLink(product);
                        }}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border transition-colors ${
                          isDark
                            ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                        aria-label="Copy product link"
                      >
                        <FaLink />
                      </button>
                    </div>
                  </div>

                  <div className="absolute right-4 top-4 rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                    Click to open
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {!isLoading && hasQuery && results.length === 0 && (
          <div className={`mt-10 rounded-2xl p-8 text-center ${panelClass}`}>
            <h2 className={`text-xl font-bold ${headingClass}`}>No matches found</h2>
            <p className={`mt-2 ${bodyClass}`}>
              Try another product name, category, or brand.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;
