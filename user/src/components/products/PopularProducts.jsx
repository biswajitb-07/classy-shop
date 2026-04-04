import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";
import HomeProductCard from "./HomeProductCard";
import { useHomeCatalog } from "../../hooks/useHomeCatalog.js";

const PopularProduct = () => {
  const productScrollRef = useRef(null);
  const navScrollRef = useRef(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);
  const [canScrollNavRight, setCanScrollNavRight] = useState(false);
  const [canScrollProductLeft, setCanScrollProductLeft] = useState(false);
  const [canScrollProductRight, setCanScrollProductRight] = useState(false);
  const { categories, popularProductsByCategory } = useHomeCatalog();
  const [selectedCategory, setSelectedCategory] = useState("Fashion");

  const visibleCategories = categories;
  const selectedCategoryData =
    visibleCategories.find((category) => category.key === selectedCategory) ||
    visibleCategories[0];
  const popularProducts =
    (popularProductsByCategory?.[selectedCategoryData?.key] || []).slice(0, 7);
  const isLoading = selectedCategoryData?.isLoading ?? false;

  const checkNavScrollability = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollNavLeft(scrollLeft > 0);
      setCanScrollNavRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const handleResize = () => {
    checkNavScrollability();
    checkProductScrollability();
  };

  const checkProductScrollability = () => {
    if (productScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = productScrollRef.current;
      setCanScrollProductLeft(scrollLeft > 0);
      setCanScrollProductRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scroll = (ref, direction) => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.6; // Scroll by 60% of container width
      ref.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    checkNavScrollability();
    checkProductScrollability();
    const navContainer = navScrollRef.current;
    const productContainer = productScrollRef.current;

    if (navContainer) {
      navContainer.addEventListener("scroll", checkNavScrollability);
    }
    if (productContainer) {
      productContainer.addEventListener("scroll", checkProductScrollability);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      if (navContainer) {
        navContainer.removeEventListener("scroll", checkNavScrollability);
      }
      if (productContainer) {
        productContainer.removeEventListener(
          "scroll",
          checkProductScrollability
        );
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [popularProducts, visibleCategories]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  useEffect(() => {
    const hasSelectedCategory = visibleCategories.some(
      (category) => category.key === selectedCategory
    );

    if (!hasSelectedCategory) {
      setSelectedCategory(visibleCategories[0]?.key || "Fashion");
    }
  }, [selectedCategory, visibleCategories]);

  return (
    <section className="container mx-auto px-4">
      <div className="mb-8 w-full flex flex-col items-center justify-center text-center md:text-left group">
        <div>
          <h1 className="text-xl md:text-3xl font-semibold text-center">
            Popular Products
          </h1>
          <p className="text-sm text-gray-500 py-2">
            Don’t miss the current offers until the end of March.
          </p>
        </div>

        {/* Nav Tabs with Arrows */}
        <div className="relative mt-4 w-full max-w-6xl">
          <button
            onClick={() => scroll(navScrollRef, "left")}
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hidden md:block ${
              canScrollNavLeft
                ? "opacity-100 translate-x-0 group-hover:opacity-100"
                : "opacity-0 -translate-x-10 pointer-events-none"
            }`}
          >
            <FaChevronLeft className="text-[13px] md:text-[18px] lg:text-[24px]" />
          </button>
          <button
            onClick={() => scroll(navScrollRef, "right")}
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hidden md:block ${
              canScrollNavRight
                ? "opacity-100 translate-x-0 group-hover:opacity-100"
                : "opacity-0 translate-x-10 pointer-events-none"
            }`}
          >
            <FaChevronRight className="text-[13px] md:text-[18px] lg:text-[24px]" />
          </button>

          <div
            ref={navScrollRef}
            className="flex w-full gap-4 overflow-x-auto scroll-smooth px-1 pb-2 text-sm font-medium text-gray-600 scrollbar-hide sm:justify-center sm:gap-6 sm:px-2"
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
            }}
          >
            {visibleCategories.map((category) => (
              <button
                key={category.key}
                onClick={() => handleCategoryClick(category.key)}
                className={`flex-shrink-0 whitespace-nowrap transition cursor-pointer snap-start text-base ${
                  selectedCategory === category.key
                    ? "text-red-600"
                    : "hover:text-red-500 text-gray-700"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative group">
        <button
          onClick={() => scroll(productScrollRef, "left")}
          className={`absolute left-0 top-1/3 z-10 p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hidden md:block ${
            canScrollProductLeft
              ? "opacity-100 translate-x-0 group-hover:opacity-100"
              : "opacity-0 -translate-x-10 pointer-events-none"
          }`}
        >
          <FaChevronLeft className="md:text-[20px] lg:text-[26px]" />
        </button>
        <button
          onClick={() => scroll(productScrollRef, "right")}
          className={`absolute right-0 top-1/3 z-10 p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out hidden md:block ${
            canScrollProductRight
              ? "opacity-100 translate-x-0 group-hover:opacity-100"
              : "opacity-0 translate-x-10 pointer-events-none"
          }`}
        >
          <FaChevronRight className="md:text-[20px] lg:text-[26px]" />
        </button>

        <div className="snap-start">
          <HomeProductCard
            productScrollRef={productScrollRef}
            products={popularProducts}
            isLoading={isLoading}
          />
        </div>
      </div>
    </section>
  );
};

export default PopularProduct;
