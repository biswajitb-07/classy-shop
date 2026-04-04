import { useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { IoSearch } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";
import { useMarketplaceSearch } from "./search/useMarketplaceSearch.js";
import { useGetAiSearchResultsQuery } from "../features/api/aiApi.js";
import PageLoader from "./Loader/PageLoader.jsx";

const Search = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isOpeningProduct, setIsOpeningProduct] = useState(false);
  const wrapperRef = useRef(null);
  const deferredQuery = useDeferredValue(query);
  const shouldLoadSuggestions = Boolean(deferredQuery.trim());
  const { suggestionProducts, isLoading, getProductPath } =
    useMarketplaceSearch(deferredQuery, { enabled: shouldLoadSuggestions });
  const { data: aiSearchData, isFetching: isAiSearching } =
    useGetAiSearchResultsQuery(
      { query: deferredQuery, limit: 4 },
      { skip: !shouldLoadSuggestions }
    );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedQuery = query.trim();

  const executeSearch = (event) => {
    event?.preventDefault?.();
    const term = query.trim();
    if (!term) return;
    setIsOpen(false);
    window.sessionStorage.setItem("classy-store-search-term", term);
    navigate(`/search?q=${encodeURIComponent(term)}`, {
      state: { fromSearch: true, query: term },
    });
  };

  const onSubmit = (event) => {
    event.preventDefault();
    executeSearch();
  };

  const openSuggestion = (product) => {
    setQuery(product.name);
    setIsOpen(false);
    setIsOpeningProduct(true);
    window.setTimeout(() => {
      navigate(getProductPath(product, query), {
        state: { fromSearch: true, query, openingProduct: true },
      });
    }, 40);
  };

  const suggestionList = useMemo(
    () => suggestionProducts,
    [suggestionProducts]
  );
  const aiSuggestionList = useMemo(() => aiSearchData?.products || [], [aiSearchData?.products]);

  const shellClass = isDark
    ? "bg-slate-900 border border-slate-700 text-slate-100"
    : "bg-[#e5e5e5] border border-transparent text-slate-900";
  const panelClass = isDark
    ? "bg-slate-900 border border-slate-700 shadow-2xl"
    : "bg-white border border-slate-200 shadow-xl";
  const inputClass = isDark
    ? "text-slate-100 placeholder:text-slate-400"
    : "text-slate-900 placeholder:text-slate-500";
  const iconButtonClass = isDark
    ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
    : "bg-white text-black hover:bg-gray-400";

  return (
    <div ref={wrapperRef} className="relative w-full">
      {isOpeningProduct ? <PageLoader message="Opening product..." /> : null}
      <form onSubmit={onSubmit} className={`searchBox w-full h-[50px] rounded-[10px] relative p-2 ${shellClass}`}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search for products..."
          className={`w-full h-[35px] focus:outline-none p-2 bg-transparent text-[15px] ${inputClass}`}
        />

        <button
          type="button"
          onClick={executeSearch}
          className={`absolute top-[7px] right-[5px] z-50 w-[37px] min-w-[37px] h-[37px] rounded-full cursor-pointer hover:shadow-lg hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out flex justify-center items-center ${iconButtonClass}`}
        >
          <IoSearch className="text-[20px] transition-colors duration-300" />
        </button>
      </form>

      {isOpen && trimmedQuery && (
        <div className={`absolute top-[58px] left-0 w-full rounded-2xl overflow-hidden z-50 ${panelClass}`}>
          <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {isLoading || isAiSearching
              ? "Searching products..."
              : `${aiSuggestionList.length + suggestionList.length} smart suggestions`}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {aiSuggestionList.length > 0 ? (
              <div className={`border-b px-4 py-3 ${isDark ? "border-slate-800 bg-slate-950/80" : "border-slate-100 bg-amber-50/60"}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-2 ${isDark ? "bg-cyan-500/15 text-cyan-300" : "bg-amber-100 text-amber-600"}`}>
                    <Sparkles size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-[0.28em] ${isDark ? "text-cyan-300" : "text-amber-700"}`}>
                      AI Smart Search
                    </p>
                    <p className={`mt-1 text-xs leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      {aiSearchData?.explanation || "Query ko smart way me samajh kar relevant products pick kiye gaye hain."}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {aiSuggestionList.map((product) => (
                    <button
                      key={`ai-${product.sourceLabel}-${product._id}`}
                      type="button"
                      onClick={() => openSuggestion(product)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors ${
                        isDark ? "bg-slate-900/70 hover:bg-slate-800" : "bg-white/90 hover:bg-white"
                      }`}
                    >
                      <img
                        src={product.image?.[0] || product.image || "/fallback-image.jpg"}
                        alt={product.name}
                        className={`h-11 w-11 rounded-xl object-cover border ${
                          isDark ? "border-slate-700" : "border-slate-200"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {product.name}
                        </p>
                        <p className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {product.sourceLabel} • ₹{Number(product.salePrice || product.discountedPrice || product.price || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {suggestionList.length > 0 ? (
              suggestionList.map((product) => (
                <button
                  key={`${product.sourceLabel}-${product._id}`}
                  type="button"
                  onClick={() => openSuggestion(product)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
                  }`}
                >
                  <img
                    src={product.image?.[0] || product.image || "/fallback-image.jpg"}
                    alt={product.name}
                    className={`w-12 h-12 rounded-lg object-cover border ${
                      isDark ? "border-slate-700" : "border-slate-200"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
                      {product.name}
                    </p>
                    <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      {product.sourceLabel}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className={`px-4 py-6 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                No products found for "{trimmedQuery}".
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onSubmit}
            className="w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 hover:opacity-95 transition-opacity"
          >
            View all search results
          </button>
        </div>
      )}
    </div>
  );
};

export default Search;
