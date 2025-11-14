import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FashionProductCard from "./FashionProductCard";
import ProductFilter from "../../../../components/products/ProductFilter";
import { useGetFashionItemsQuery } from "../../../../features/api/fashionApi";
import ErrorMessage from "../../../../components/error/ErrorMessage";
import ProductNotAvailable from "../../../../components/products/ProductNotAvailable";
import { useGetVendorCategoriesQuery } from "../../../../features/api/categoryApi";
import { CgCloseR } from "react-icons/cg";

const PAGE_SIZE = 15;

const Fashion = () => {
  const { subcategory, thirdcategory } = useParams();
  const { data, isLoading, isError, refetch } = useGetFashionItemsQuery();
  const { data: categories } = useGetVendorCategoriesQuery();

  const categoryData = categories?.[0]?.categories || [];

  const allProducts = data?.fashionItems ?? [];
  const navigate = useNavigate();

  const normalizeForDisplay = (cat) =>
    cat
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/\s+/g, " ")
      .trim();

  const normalizeForFilter = (str) =>
    str
      ?.toLowerCase()
      .replace(/[-\s&]/g, "")
      .trim();

  const [appliedFilters, setAppliedFilters] = useState({
    categories: [],
    minPrice: 0,
    maxPrice: 60000,
    ratings: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const displaySub = normalizeForDisplay(subcategory);
    const displayThird = normalizeForDisplay(thirdcategory);

    setAppliedFilters((prev) => ({
      ...prev,
      categories: displayThird
        ? [displayThird]
        : displaySub
        ? [displaySub]
        : [],
    }));
    setCurrentPage(1);
  }, [subcategory, thirdcategory]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, appliedFilters]);
  useEffect(() => setCurrentPage(1), [allProducts, appliedFilters]);

  const filteredProducts = useMemo(() => {
    if (!allProducts.length) return [];

    const normalizedFilters = appliedFilters.categories.map(normalizeForFilter);

    return allProducts.filter((p) => {
      const price = Number(p.discountedPrice ?? p.originalPrice ?? 0);
      const subCat = p.subCategory || "";
      const thirdCat = p.thirdLevelCategory || "";

      const matchesCategory =
        normalizedFilters.length === 0 ||
        normalizedFilters.some(
          (filter) =>
            normalizeForFilter(subCat) === filter ||
            normalizeForFilter(thirdCat) === filter
        );

      return (
        matchesCategory &&
        price >= appliedFilters.minPrice &&
        price <= appliedFilters.maxPrice &&
        (appliedFilters.ratings.length === 0 ||
          appliedFilters.ratings.some((r) => (p.rating ?? 0) >= r))
      );
    });
  }, [allProducts, appliedFilters]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const currentPageProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage]);

  const availableCategories = useMemo(() => {
    const categoriesSet = new Set();

    categoryData.forEach((category) => {
      categoriesSet.add(category.name);
      if (category.subCategories) {
        category.subCategories.forEach((subCat) => {
          categoriesSet.add(subCat.name);
          if (subCat.thirdLevelCategories) {
            subCat.thirdLevelCategories.forEach((thirdCat) => {
              if (thirdCat) categoriesSet.add(thirdCat);
            });
          }
        });
      }
    });

    allProducts.forEach((p) => {
      if (p.subCategory) categoriesSet.add(p.subCategory);
      if (p.thirdLevelCategory) categoriesSet.add(p.thirdLevelCategory);
    });

    return [...categoriesSet].filter(Boolean);
  }, [categoryData, allProducts]);

  const handleApplyFilters = (f) => {
    setAppliedFilters(f);
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const handleClearFilters = () => {
    const displaySub = normalizeForDisplay(subcategory);
    const displayThird = normalizeForDisplay(thirdcategory);

    setAppliedFilters({
      categories: displayThird
        ? [displayThird]
        : displaySub
        ? [displaySub]
        : [],
      minPrice: 0,
      maxPrice: 60000,
      ratings: [],
    });
    setCurrentPage(1);
    setShowMobileFilters(false);
  };

  const renderPaginationNumbers = (current, total, setPage) => {
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 4) pages.push("start-ellipsis");
      const start = Math.max(2, current - 2);
      const end = Math.min(total - 1, current + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 3) pages.push("end-ellipsis");
      pages.push(total);
    }

    return pages.map((p, idx) =>
      p === "start-ellipsis" || p === "end-ellipsis" ? (
        <span key={p + idx} className="px-2 text-gray-500">
          ...
        </span>
      ) : (
        <button
          key={p}
          onClick={() => setPage(p)}
          className={`px-3 py-1 border rounded-md text-sm cursor-pointer ${
            p === current
              ? "bg-red-500 text-white border-red-500"
              : "bg-white hover:bg-gray-100"
          }`}
        >
          {p}
        </button>
      )
    );
  };

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load fashion products"
        message="We couldn’t fetch the items right now. Please check your internet connection or try again."
        onRetry={refetch}
      />
    );
  }

  return (
    <div>
      {showMobileFilters && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMobileFilters(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-full md:w-[26rem] bg-white shadow-xl z-40 transition duration-400 ease-in-out px-7 ${
          showMobileFilters ? "translate-x-0" : "-translate-x-full"
        } scrollbar-hide overflow-y-auto`}
      >
        <div className=" w-full flex justify-end items-center pb-3 pt-6">
          <CgCloseR
            onClick={() => setShowMobileFilters(false)}
            size={26}
            className="hover:text-red-500 cursor-pointer"
          />
        </div>

        <ProductFilter
          availableCategories={availableCategories}
          initialFilters={appliedFilters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />
      </aside>

      <div className="container grid gap-6">
        <main className="lg:col-span-9">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {normalizeForDisplay(thirdcategory || subcategory || "Fashion")}
              </h1>
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems}{" "}
                products
              </p>
            </div>

            <button
              className="px-3 py-1 border rounded-md bg-red-500 text-white cursor-pointer"
              onClick={() => setShowMobileFilters(true)}
            >
              Filters
            </button>
          </div>

          {filteredProducts.length === 0 && !isLoading ? (
            <ProductNotAvailable />
          ) : (
            <>
              <FashionProductCard
                products={currentPageProducts}
                isLoading={isLoading}
              />
              {totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-between text-sm mb-10">
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded text-white disabled:bg-red-300 bg-red-500 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Prev
                    </button>
                    {renderPaginationNumbers(
                      currentPage,
                      totalPages,
                      setCurrentPage
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded disabled:cursor-not-allowed text-white disabled:bg-red-300 bg-red-500 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Fashion;
