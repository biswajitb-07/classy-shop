import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRef, useState } from "react";
import HomeProductCard from "./HomeProductCard";

const RelatedProduct = ({ products, isLoading }) => {
  const productScrollRef = useRef(null);
  const [arrowIcon, setArrowIcon] = useState(false);

  const toggleArrowIcon = (state) => {
    setArrowIcon(state);
  };

  const scroll = (ref, direction) => {
    if (ref.current) {
      const { scrollLeft, clientWidth } = ref.current;
      const scrollAmount = clientWidth * 0.6;
      ref.current.scrollTo({
        left:
          direction === "left"
            ? scrollLeft - scrollAmount
            : scrollLeft + scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (!products?.length && !isLoading) {
    return null; 
  }

  return (
    <section className="container mx-auto px-4 py-9">
      <div className="mb-6 w-full flex flex-col items-start justify-center">
        <h1 className="text-sm md:text-2xl font-medium text-gray-700">
          Related Products
        </h1>
      </div>

      <div
        onMouseEnter={() => toggleArrowIcon(true)}
        onMouseLeave={() => toggleArrowIcon(false)}
        className="relative"
      >
        {/* Left Arrow */}
        <div className="absolute left-0 top-1/3 z-10 hidden md:block">
          <button
            onClick={() => scroll(productScrollRef, "left")}
            className={`p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out ${
              arrowIcon
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-10"
            }`}
          >
            <FaChevronLeft className="md:text-[20px] lg:text-[26px]" />
          </button>
        </div>

        {/* Right Arrow */}
        <div className="absolute right-0 top-1/3 z-10 hidden md:block">
          <button
            onClick={() => scroll(productScrollRef, "right")}
            className={`p-2 rounded-full bg-red-500 text-white shadow hover:bg-red-400 cursor-pointer hover:scale-105 active:scale-75 transition-all duration-300 ease-in-out ${
              arrowIcon
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-10"
            }`}
          >
            <FaChevronRight className="md:text-[20px] lg:text-[26px]" />
          </button>
        </div>

        {/* Product Cards */}
        <div className="snap-start">
          <HomeProductCard
            productScrollRef={productScrollRef}
            products={products}
            isLoading={isLoading}
          />
        </div>
      </div>
    </section>
  );
};

export default RelatedProduct;
