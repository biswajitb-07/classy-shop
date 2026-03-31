import React, { useEffect, useMemo, useState } from "react";
import { FaStar } from "react-icons/fa";
import {
  FiChevronDown,
  FiFilter,
  FiPackage,
  FiRefreshCw,
  FiSliders,
} from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext.jsx";
import { PRODUCT_MAX_PRICE } from "../../utils/productFiltering.js";

const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "price_low_to_high", label: "Price: Low to High" },
  { value: "price_high_to_low", label: "Price: High to Low" },
  { value: "rating_high_to_low", label: "Highest Rated" },
  { value: "discount_high_to_low", label: "Best Discount" },
  { value: "popular", label: "Most Popular" },
];

const discountOptions = [0, 10, 20, 30, 40, 50];

const defaultExpandedSections = {
  quick: true,
  price: false,
  categories: false,
  brands: false,
  ratings: false,
};

const ProductFilter = ({
  availableCategories = [],
  availableBrands = [],
  initialFilters,
  onApply,
  onClear,
}) => {
  const { isDark } = useTheme();
  const [categories, setCategories] = useState(initialFilters.categories || []);
  const [brands, setBrands] = useState(initialFilters.brands || []);
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(
    initialFilters.maxPrice ?? PRODUCT_MAX_PRICE
  );
  const [ratings, setRatings] = useState(initialFilters.ratings || []);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || "recommended");
  const [stockOnly, setStockOnly] = useState(Boolean(initialFilters.stockOnly));
  const [minDiscount, setMinDiscount] = useState(
    Number(initialFilters.minDiscount || 0)
  );
  const [expandedSections, setExpandedSections] = useState(
    defaultExpandedSections
  );

  useEffect(() => {
    setCategories(initialFilters.categories || []);
    setBrands(initialFilters.brands || []);
    setMinPrice(initialFilters.minPrice ?? 0);
    setMaxPrice(initialFilters.maxPrice ?? PRODUCT_MAX_PRICE);
    setRatings(initialFilters.ratings || []);
    setSortBy(initialFilters.sortBy || "recommended");
    setStockOnly(Boolean(initialFilters.stockOnly));
    setMinDiscount(Number(initialFilters.minDiscount || 0));
  }, [initialFilters]);

  const toggleSelection = (value, setter) => {
    setter((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleClear = () => {
    setCategories([]);
    setBrands([]);
    setMinPrice(0);
    setMaxPrice(PRODUCT_MAX_PRICE);
    setRatings([]);
    setSortBy("recommended");
    setStockOnly(false);
    setMinDiscount(0);
    onClear();
  };

  const handleApply = () => {
    onApply({
      categories,
      brands,
      minPrice: Number(minPrice),
      maxPrice: Number(maxPrice),
      ratings,
      sortBy,
      stockOnly,
      minDiscount: Number(minDiscount),
    });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minPrice > 0 || maxPrice < PRODUCT_MAX_PRICE) count += 1;
    if (ratings.length) count += ratings.length;
    if (categories.length) count += categories.length;
    if (brands.length) count += brands.length;
    if (stockOnly) count += 1;
    if (minDiscount > 0) count += 1;
    if (sortBy !== "recommended") count += 1;
    return count;
  }, [
    brands.length,
    categories.length,
    maxPrice,
    minDiscount,
    minPrice,
    ratings.length,
    sortBy,
    stockOnly,
  ]);

  const quickSummary = useMemo(() => {
    const items = [];
    if (sortBy !== "recommended") {
      items.push(sortOptions.find((option) => option.value === sortBy)?.label || sortBy);
    }
    if (stockOnly) items.push("In stock");
    if (minDiscount > 0) items.push(`${minDiscount}%+ off`);
    if (categories.length) items.push(`${categories.length} categories`);
    if (brands.length) items.push(`${brands.length} brands`);
    if (ratings.length) items.push(`${Math.max(...ratings)}★ & up`);
    if (minPrice > 0 || maxPrice < PRODUCT_MAX_PRICE) {
      items.push(`Rs ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`);
    }
    return items;
  }, [
    brands.length,
    categories.length,
    maxPrice,
    minDiscount,
    minPrice,
    ratings,
    sortBy,
    stockOnly,
  ]);

  const shellClass = isDark
    ? "border-slate-800 bg-slate-950 shadow-[0_18px_50px_rgba(2,6,23,0.5)]"
    : "border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]";
  const panelClass = isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50";
  const titleClass = isDark ? "text-white" : "text-slate-900";
  const bodyClass = isDark ? "text-slate-300" : "text-slate-600";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const inputClass = isDark
    ? "border-slate-700 bg-slate-950 text-slate-100"
    : "border-slate-200 bg-white text-slate-700";
  const chipBaseClass = isDark
    ? "border-slate-700 bg-slate-950 text-slate-200"
    : "border-slate-200 bg-white text-slate-700";

  const renderAccordion = (key, title, count, children, icon = null) => (
    <section className={`rounded-3xl border ${panelClass}`}>
      <button
        type="button"
        onClick={() => toggleSection(key)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 text-white">
              {icon}
            </div>
          ) : null}
          <div>
            <h3 className={`text-sm font-semibold sm:text-base ${titleClass}`}>{title}</h3>
            {count ? (
              <p className={`text-xs ${mutedClass}`}>{count} selected</p>
            ) : (
              <p className={`text-xs ${mutedClass}`}>Tap to expand</p>
            )}
          </div>
        </div>

        <FiChevronDown
          className={`h-5 w-5 transition ${mutedClass} ${
            expandedSections[key] ? "rotate-180" : ""
          }`}
        />
      </button>

      {expandedSections[key] ? <div className="border-t px-4 py-4">{children}</div> : null}
    </section>
  );

  return (
    <div className={`overflow-hidden rounded-[28px] border ${shellClass} mb-5`}>
      <div className="border-b border-inherit px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 text-white">
              <FiFilter className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${titleClass}`}>Filters</h2>
              <p className={`text-xs sm:text-sm ${bodyClass}`}>
                Compact controls for faster browsing.
              </p>
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

        {quickSummary.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSummary.map((item) => (
              <span
                key={item}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${chipBaseClass}`}
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {renderAccordion(
          "quick",
          "Quick controls",
          Number(stockOnly) + Number(minDiscount > 0) + Number(sortBy !== "recommended"),
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={`mb-2 block text-xs font-semibold uppercase ${mutedClass}`}>
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className={`w-full rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-xs font-semibold uppercase ${mutedClass}`}>
                Minimum discount
              </label>
              <select
                value={minDiscount}
                onChange={(event) => setMinDiscount(Number(event.target.value))}
                className={`w-full rounded-2xl border px-4 py-3 outline-none ${inputClass}`}
              >
                {discountOptions.map((value) => (
                  <option key={value} value={value}>
                    {value === 0 ? "Any discount" : `${value}% or more`}
                  </option>
                ))}
              </select>
            </div>

            <label
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 sm:col-span-2 ${chipBaseClass}`}
            >
              <div className="flex items-center gap-3">
                <FiPackage className={`h-4 w-4 ${mutedClass}`} />
                <span className={`text-sm font-medium ${titleClass}`}>In stock only</span>
              </div>
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(event) => setStockOnly(event.target.checked)}
                className="h-4 w-4 accent-red-500"
              />
            </label>
          </div>,
          <FiSliders className="h-4 w-4" />
        )}

        {renderAccordion(
          "price",
          "Price range",
          minPrice > 0 || maxPrice < PRODUCT_MAX_PRICE ? 1 : 0,
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-2xl border px-4 py-3 ${inputClass}`}>
                <p className={`text-[11px] font-semibold uppercase ${mutedClass}`}>Min</p>
                <p className={`mt-1 text-sm font-bold sm:text-base ${titleClass}`}>
                  Rs {minPrice.toLocaleString()}
                </p>
              </div>
              <div className={`rounded-2xl border px-4 py-3 ${inputClass}`}>
                <p className={`text-[11px] font-semibold uppercase ${mutedClass}`}>Max</p>
                <p className={`mt-1 text-sm font-bold sm:text-base ${titleClass}`}>
                  Rs {maxPrice.toLocaleString()}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm ${bodyClass}`}>Minimum price</span>
                <span className={`text-sm font-semibold ${titleClass}`}>
                  Rs {minPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={PRODUCT_MAX_PRICE}
                value={minPrice}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value > maxPrice) setMaxPrice(value);
                  setMinPrice(value);
                }}
                className="h-2 w-full cursor-pointer rounded-lg accent-red-500"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm ${bodyClass}`}>Maximum price</span>
                <span className={`text-sm font-semibold ${titleClass}`}>
                  Rs {maxPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={PRODUCT_MAX_PRICE}
                value={maxPrice}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value < minPrice) setMinPrice(value);
                  setMaxPrice(value);
                }}
                className="h-2 w-full cursor-pointer rounded-lg accent-red-500"
              />
            </div>
          </div>,
          <FiSliders className="h-4 w-4" />
        )}

        {availableCategories.length
          ? renderAccordion(
              "categories",
              "Categories",
              categories.length,
              <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {availableCategories.map((category) => {
                  const checked = categories.includes(category);
                  return (
                    <button
                      type="button"
                      key={category}
                      onClick={() => toggleSelection(category, setCategories)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-medium transition ${
                        checked
                          ? "border-red-400 bg-red-50 text-red-600"
                          : chipBaseClass
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>,
              <FiFilter className="h-4 w-4" />
            )
          : null}

        {availableBrands.length
          ? renderAccordion(
              "brands",
              "Brands",
              brands.length,
              <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {availableBrands.map((brand) => {
                  const checked = brands.includes(brand);
                  return (
                    <button
                      type="button"
                      key={brand}
                      onClick={() => toggleSelection(brand, setBrands)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm font-medium transition ${
                        checked
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : chipBaseClass
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>,
              <FiPackage className="h-4 w-4" />
            )
          : null}

        {renderAccordion(
          "ratings",
          "Ratings",
          ratings.length,
          <div className="space-y-2">
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
                        : chipBaseClass
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <FaStar
                          key={index}
                          className={`h-4 w-4 ${
                            index < rating ? "text-amber-400" : "text-slate-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${titleClass}`}>
                      {rating} stars & up
                    </span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelection(rating, setRatings)}
                      className="h-4 w-4 accent-red-500"
                    />
                  </div>
                </label>
              );
            })}
          </div>,
          <FaStar className="h-4 w-4" />
        )}

        <div className={`sticky bottom-0 rounded-3xl border p-4 ${panelClass}`}>
          <div className="grid gap-3 sm:grid-cols-2">
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
    </div>
  );
};

export default ProductFilter;
