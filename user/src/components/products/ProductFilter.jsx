import React, { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import { FiFilter, FiRefreshCw, FiSliders } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext.jsx";

const MAX_PRICE = 60000;

const ProductFilter = ({ initialFilters, onApply, onClear }) => {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState(initialFilters.categories || []);
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice ?? MAX_PRICE);
  const [ratings, setRatings] = useState(initialFilters.ratings || []);

  useEffect(() => {
    setCategories(initialFilters.categories || []);
    setMinPrice(initialFilters.minPrice ?? 0);
    setMaxPrice(initialFilters.maxPrice ?? MAX_PRICE);
    setRatings(initialFilters.ratings || []);
  }, [initialFilters]);

  const toggleRating = (rating) => {
    setRatings((prev) =>
      prev.includes(rating)
        ? prev.filter((value) => value !== rating)
        : [...prev, rating].sort((a, b) => b - a)
    );
  };

  const handleClear = () => {
    setCategories([]);
    setMinPrice(0);
    setMaxPrice(MAX_PRICE);
    setRatings([]);
    onClear();
  };

  const handleApply = () => {
    onApply({
      categories,
      minPrice: Number(minPrice),
      maxPrice: Number(maxPrice),
      ratings,
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minPrice > 0 || maxPrice < MAX_PRICE) count += 1;
    if (ratings.length) count += ratings.length;
    if (categories.length) count += categories.length;
    return count;
  }, [categories.length, maxPrice, minPrice, ratings.length]);

  const selectedRatingLabel = ratings.length
    ? `${ratings.length} rating filter${ratings.length > 1 ? "s" : ""}`
    : "No rating filter";

  const shellClass = isDark
    ? "border-slate-800 bg-slate-950 shadow-[0_28px_60px_rgba(2,6,23,0.55)]"
    : "border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]";
  const headerClass = isDark
    ? "border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_38%),linear-gradient(135deg,#020617_0%,#111827_45%,#0f172a_100%)]"
    : "border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.18),_transparent_40%),linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#fff1f2_100%)]";
  const sectionClass = isDark
    ? "border-slate-800 bg-slate-900/80"
    : "border-slate-200 bg-slate-50/90";
  const titleClass = isDark ? "text-white" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-300" : "text-slate-600";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const trackClass = isDark ? "bg-slate-700" : "bg-slate-200";
  const inlineBoxClass = isDark
    ? "border-slate-700 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-white text-slate-700";
  const rowClass = isDark
    ? "border-slate-800 bg-slate-950/70 hover:border-slate-700"
    : "border-slate-200 bg-white hover:border-slate-300";

  return (
    <div className={`overflow-hidden rounded-[28px] border ${shellClass}`}>
      <div className={`border-b px-5 py-5 sm:px-6 sm:py-6 ${headerClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 text-white shadow-lg shadow-red-500/20">
                <FiFilter className="h-5 w-5" />
              </div>
              <div>
                <h2 className={`text-xl font-bold sm:text-2xl ${titleClass}`}>
                  Product Filters
                </h2>
                <p className={`mt-1 text-sm ${bodyClass}`}>
                  Refine results by price and customer rating.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              activeFilterCount
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white"
                : isDark
                ? "bg-slate-800 text-slate-300"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {activeFilterCount} active
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:space-y-6 sm:p-6">
        <section className={`rounded-[24px] border p-5 ${sectionClass}`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-semibold ${titleClass}`}>
                Price range
              </h3>
              <p className={`mt-1 text-sm ${mutedClass}`}>
                Choose the budget that fits your shopping plan.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20">
              <FiSliders className="h-4 w-4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-2xl border px-4 py-3 ${inlineBoxClass}`}>
              <p className={`text-[11px] font-semibold uppercase ${mutedClass}`}>
                Min
              </p>
              <p className="mt-1 text-base font-bold">
                ₹{minPrice.toLocaleString()}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${inlineBoxClass}`}>
              <p className={`text-[11px] font-semibold uppercase ${mutedClass}`}>
                Max
              </p>
              <p className="mt-1 text-base font-bold">
                ₹{maxPrice.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={`text-sm font-medium ${bodyClass}`}>
                  Minimum price
                </label>
                <span className={`text-sm font-semibold ${titleClass}`}>
                  ₹{minPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={MAX_PRICE}
                value={minPrice}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value > maxPrice) setMaxPrice(value);
                  setMinPrice(value);
                }}
                className={`h-2 w-full cursor-pointer rounded-lg accent-red-500 ${trackClass}`}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={`text-sm font-medium ${bodyClass}`}>
                  Maximum price
                </label>
                <span className={`text-sm font-semibold ${titleClass}`}>
                  ₹{maxPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={MAX_PRICE}
                value={maxPrice}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value < minPrice) setMinPrice(value);
                  setMaxPrice(value);
                }}
                className={`h-2 w-full cursor-pointer rounded-lg accent-red-500 ${trackClass}`}
              />
            </div>
          </div>

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 ${inlineBoxClass}`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`text-sm ${bodyClass}`}>Selected budget</span>
              <span className={`text-sm font-semibold ${titleClass}`}>
                ₹{minPrice.toLocaleString()} - ₹{maxPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        <section className={`rounded-[24px] border p-5 ${sectionClass}`}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-semibold ${titleClass}`}>
                Customer rating
              </h3>
              <p className={`mt-1 text-sm ${mutedClass}`}>
                Show products with strong buyer feedback.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/20">
              <FaStar className="h-4 w-4" />
            </div>
          </div>

          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const checked = ratings.includes(rating);
              return (
                <label key={rating} className="block cursor-pointer">
                  <div
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked
                        ? isDark
                          ? "border-amber-400 bg-amber-400/10"
                          : "border-amber-300 bg-amber-50"
                        : rowClass
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked
                          ? "border-amber-500 bg-gradient-to-br from-amber-400 to-orange-500 text-white"
                          : isDark
                          ? "border-slate-600 bg-slate-900"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRating(rating)}
                        className="sr-only"
                      />
                      {checked ? <span className="text-[10px]">✓</span> : null}
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <FaStar
                              key={index}
                              className={`h-4 w-4 ${
                                index < rating
                                  ? "text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className={`text-sm font-medium ${titleClass}`}>
                          & up
                        </span>
                      </div>

                      <span className={`text-xs font-semibold ${mutedClass}`}>
                        {rating} star{rating > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 ${inlineBoxClass}`}
          >
            <p className={`text-sm ${bodyClass}`}>{selectedRatingLabel}</p>
          </div>
        </section>

        <div
          className={`rounded-[24px] border p-4 ${sectionClass} flex flex-col gap-3`}
        >
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 via-pink-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <FiFilter className="h-4 w-4" />
            Apply filters
          </button>

          <button
            type="button"
            onClick={handleClear}
            className={`flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
              isDark
                ? "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <FiRefreshCw className="h-4 w-4" />
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilter;
