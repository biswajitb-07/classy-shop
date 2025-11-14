import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRef, useState, useEffect } from "react";
import HomeProductCard from "./HomeProductCard";
import { useGetFashionItemsQuery } from "../../features/api/fashionApi";
import { useGetVendorCategoriesQuery } from "../../features/api/categoryApi";
import { useGetElectronicItemsQuery } from "../../features/api/electronicApi";

const PopularProduct = () => {
  const productScrollRef = useRef(null);
  const navScrollRef = useRef(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);
  const [canScrollNavRight, setCanScrollNavRight] = useState(false);
  const [canScrollProductLeft, setCanScrollProductLeft] = useState(false);
  const [canScrollProductRight, setCanScrollProductRight] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Fashion");

  const { data: fashionData, isLoading: fashionLoading } =
    useGetFashionItemsQuery();
  const { data: categories } = useGetVendorCategoriesQuery();
  const { data: electronicData, isLoading: electronicLoading } =
    useGetElectronicItemsQuery();

  const categoryData = categories?.[0]?.categories || [];

  const getPopularProducts = () => {
    if (selectedCategory === "Fashion") {
      return (
        fashionData?.fashionItems
          ?.filter((item) => item.rating > 4.5)
          .slice(-7) || []
      );
    } else if (selectedCategory === "Electronics") {
      return (
        electronicData?.electronicItems
          ?.filter((item) => item.rating > 4.5)
          .slice(-7) || []
      );
    }
    return [];
  };

  const popularProducts = getPopularProducts();
  const isLoading =
    selectedCategory === "Fashion" ? fashionLoading : electronicLoading;

  const checkNavScrollability = () => {
    if (navScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
      setCanScrollNavLeft(scrollLeft > 0);
      setCanScrollNavRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
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
    window.addEventListener("resize", () => {
      checkNavScrollability();
      checkProductScrollability();
    });

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
      window.removeEventListener("resize", () => {
        checkNavScrollability();
        checkProductScrollability();
      });
    };
  }, [categoryData, popularProducts]);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

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
        <div className="relative w-full max-w-6xl mt-4 mx-8">
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
            className="flex justify-center gap-6 text-sm font-medium text-gray-600 overflow-x-auto scroll-smooth snap-x touch-pan-x px-2 scrollbar-hide"
          >
            {categoryData.map((cat, i) => (
              <button
                key={i}
                onClick={() => handleCategoryClick(cat.name)}
                className={`flex-shrink-0 whitespace-nowrap transition cursor-pointer snap-start text-base ${
                  selectedCategory === cat.name
                    ? "text-red-600"
                    : "hover:text-red-500"
                }`}
              >
                {cat.name}
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
