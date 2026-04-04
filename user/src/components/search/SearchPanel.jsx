import { useEffect, useRef, useState, useDeferredValue } from "react";
import { FaSearch } from "react-icons/fa";
import { X, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useMarketplaceSearch } from "./useMarketplaceSearch.js";
import { useGetAiSearchResultsQuery } from "../../features/api/aiApi.js";
import PageLoader from "../Loader/PageLoader.jsx";

const SearchPanel = ({ openSearchPanel, isOpenSearchPanel }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [isOpeningProduct, setIsOpeningProduct] = useState(false);
  const inputRef = useRef(null);
  const deferredQuery = useDeferredValue(query);
  const shouldLoadSearchResults = Boolean(deferredQuery.trim());
  const { matchedProducts, isLoading, getProductPath } =
    useMarketplaceSearch(deferredQuery, { enabled: shouldLoadSearchResults });
  const { data: aiSearchData, isFetching: isAiSearching } =
    useGetAiSearchResultsQuery(
      { query: deferredQuery, limit: 8 },
      { skip: !shouldLoadSearchResults }
    );
  const searchResults = aiSearchData?.products?.length ? aiSearchData.products : matchedProducts;

  useEffect(() => {
    const root = document.documentElement;
    if (isOpenSearchPanel) {
      root.classList.add("overflow-hidden");
    } else {
      root.classList.remove("overflow-hidden");
    }
    return () => root.classList.remove("overflow-hidden");
  }, [isOpenSearchPanel]);

  useEffect(() => {
    if (isOpenSearchPanel) {
      window.setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpenSearchPanel]);

  const trimmedQuery = query.trim();
  const showResults = Boolean(trimmedQuery);

  const openProduct = (product) => {
    setIsOpeningProduct(true);
    openSearchPanel();
    window.setTimeout(() => {
      navigate(getProductPath(product, query), {
        state: { fromSearch: true, query, openingProduct: true },
      });
    }, 40);
  };

  return (
    <>
      {isOpeningProduct ? <PageLoader message="Opening product..." /> : null}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-500 ease-out lg:hidden
          ${isOpenSearchPanel ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={openSearchPanel}
      />

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-full md:w-[28rem] lg:hidden
          ${isDark ? "bg-[#0b1020] text-white" : "bg-gradient-to-br from-white via-gray-50 to-gray-100 text-slate-900"}
          shadow-2xl transform transition-all duration-500 ease-out overflow-hidden
          ${isOpenSearchPanel ? "translate-x-0" : "-translate-x-full"}
          ${isDark ? "border-r border-slate-700" : "border-r border-gray-200"}`}
      >
        <div className="flex flex-col h-full">
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white">
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <ShoppingBag size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-wide">
                    Marketplace Search
                  </h2>
                </div>
              </div>
              <button
                onClick={openSearchPanel}
                aria-label="Close search panel"
                className="p-1.5 sm:p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300 hover:rotate-90 hover:scale-110 backdrop-blur-sm cursor-pointer"
              >
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          <div className={`px-3 sm:px-4 md:px-6 py-4 sm:py-5 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${isDark ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"}`}>
              <FaSearch className={isDark ? "text-slate-400" : "text-slate-500"} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for products..."
                className={`w-full bg-transparent text-sm sm:text-base focus:outline-none ${isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-500"}`}
              />
              {trimmedQuery ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={`rounded-full p-1.5 transition ${isDark ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto ${isDark ? "bg-[#0f172a]" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
            {!showResults ? null : isLoading || isAiSearching ? (
              <div className="grid place-items-center h-full px-4">
                <div className="text-center">
                  <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${isDark ? "bg-slate-800" : "bg-white"}`}>
                    <FaSearch className={isDark ? "text-slate-300" : "text-gray-400"} size={26} />
                  </div>
                  <p className={`text-sm sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    Searching products...
                  </p>
                </div>
              </div>
            ) : showResults && searchResults.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full px-4 py-8 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-lg ${isDark ? "bg-slate-800" : "bg-white"}`}>
                  <FaSearch size={26} className={isDark ? "text-slate-300" : "text-gray-400"} />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                  No products found
                </h3>
                <p className="mt-2 text-center text-sm leading-6 max-w-xs">
                  Try a different product name, category, or brand.
                </p>
              </div>
            ) : (
              <div className="p-2 sm:p-3 md:p-4 space-y-3">
                {searchResults.map((product) => (
                  <button
                    key={`${product.sourceLabel}-${product._id}`}
                    type="button"
                    onClick={() => openProduct(product)}
                    className={`w-full rounded-2xl border p-3 sm:p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${isDark ? "bg-slate-900 border-slate-700 hover:border-slate-500" : "bg-white border-gray-200 hover:border-red-200"}`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image?.[0] || product.image || "/fallback-image.jpg"}
                        alt={product.name}
                        className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-rose-300" : "text-red-500"}`}>
                          {product.sourceLabel}
                        </p>
                        <h4 className={`mt-1 text-sm font-bold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                          {product.name}
                        </h4>
                        <p className={`mt-1 text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {product.category || product.productType || "Product"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          Open
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default SearchPanel;
