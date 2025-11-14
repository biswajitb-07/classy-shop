import React, { useEffect, useState } from "react";
import { FaStar } from "react-icons/fa";

const ProductFilter = ({ initialFilters, onApply, onClear }) => {
  const [categories, setCategories] = useState(initialFilters.categories || []);
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice ?? 0);
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice ?? 60000);
  const [ratings, setRatings] = useState(initialFilters.ratings || []);

  useEffect(() => {
    setCategories(initialFilters.categories || []);
    setMinPrice(initialFilters.minPrice ?? 0);
    setMaxPrice(initialFilters.maxPrice ?? 60000);
    setRatings(initialFilters.ratings || []);
  }, [initialFilters]);

  const toggleRating = (r) =>
    setRatings((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const handleClear = () => {
    setCategories([]);
    setMinPrice(0);
    setMaxPrice(60000);
    setRatings([]);
    onClear();
  };

  const handleApply = (e) => {
    e.preventDefault();
    onApply({
      categories,
      minPrice: Number(minPrice),
      maxPrice: Number(maxPrice),
      ratings,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z"
              clipRule="evenodd"
            />
          </svg>
          Filters
        </h2>
        <p className="text-red-100 text-xs sm:text-sm mt-1">Find your perfect product</p>
      </div>

      <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Price Filter */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
              Price Range
            </h3>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2 block">
                Minimum Price: ₹{minPrice.toLocaleString()}
              </label>
              <input
                type="range"
                min="0"
                max="60000"
                value={minPrice}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v > maxPrice) setMaxPrice(v);
                  setMinPrice(v);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-500"
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-gray-600 mb-2 block">
                Maximum Price: ₹{maxPrice.toLocaleString()}
              </label>
              <input
                type="range"
                min="0"
                max="60000"
                value={maxPrice}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v < minPrice) setMinPrice(v);
                  setMaxPrice(v);
                }}
                className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-red-500"
              />
            </div>

            <div className="flex items-center justify-between bg-white rounded-lg p-2 sm:p-3 border-2 border-red-100">
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                ₹{minPrice.toLocaleString()}
              </span>
              <div className="flex-1 mx-2 sm:mx-3 h-px bg-gradient-to-r from-red-500 to-pink-500"></div>
              <span className="text-xs sm:text-sm font-medium text-gray-700">
                ₹{maxPrice.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <FaStar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
              Customer Rating
            </h3>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {[5, 4, 3, 2, 1].map((r) => (
                <label key={r} className="group cursor-pointer">
                  <div
                    className={`flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-lg transition-all duration-200 ${
                      ratings.includes(r)
                        ? "bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-sm"
                        : "bg-white border-2 border-transparent hover:border-yellow-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={ratings.includes(r)}
                        onChange={() => toggleRating(r)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          ratings.includes(r)
                            ? "bg-gradient-to-br from-yellow-400 to-orange-500 border-yellow-500"
                            : "border-gray-300 group-hover:border-yellow-400"
                        }`}
                      >
                        {ratings.includes(r) && (
                          <svg
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 flex-1">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <FaStar
                            key={i}
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors duration-200 ${
                              i < r ? "text-yellow-500" : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-700">
                        & Up
                      </span>
                    </div>

                    <div className="text-xs font-medium text-gray-500">
                      {r} Star{r !== 1 ? "s" : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClear}
            className="relative overflow-hidden bg-white border-2 border-gray-300 text-gray-700 rounded-xl py-2 sm:py-3 px-4 sm:px-6 font-semibold text-xs sm:text-sm transition-all duration-300 hover:border-red-300 hover:text-red-600 hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Clear All
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-pink-50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="relative overflow-hidden bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white rounded-xl py-2 sm:py-3 px-4 sm:px-6 font-semibold text-xs sm:text-sm transition-all duration-300 hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span className="relative z-10 flex items-center justify-center gap-1 sm:gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Apply Filters
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-pink-600 to-purple-700 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilter;
