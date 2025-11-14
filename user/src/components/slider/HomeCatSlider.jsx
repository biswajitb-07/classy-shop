import { useRef, useState } from "react";
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { useGetVendorCategoriesQuery } from "../../features/api/categoryApi";

const HomeCatSlider = () => {
  const [hover, setHover] = useState(null);
  const [arrowIcon, setArrowIcon] = useState(false);

  const { data: categories, isLoading } = useGetVendorCategoriesQuery();
  const categoryData = categories?.[0]?.categories || [];

  const toggleArrowIcon = () => {
    setArrowIcon(!arrowIcon);
  };

  const scrollRef = useRef(null);
  let touchStartX = 0;
  let touchEndX = 0;

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = 200 * (direction === "left" ? -1 : 1);
    el.scrollBy({ left: distance, behavior: "smooth" });
  };

  const handleTouchStart = (e) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const threshold = 50;
    if (touchStartX - touchEndX > threshold) scroll("right");
    if (touchEndX - touchStartX > threshold) scroll("left");
  };

  return (
    <div
      onMouseEnter={toggleArrowIcon}
      onMouseLeave={toggleArrowIcon}
      className="relative w-full my-8"
    >
      <button
        onClick={() => scroll("left")}
        className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-red-500 text-white rounded-full shadow-lg items-center justify-center hover:bg-red-300 hover:text-black cursor-pointer transition-all duration-200 ease-in ${
          arrowIcon ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
        }`}
        aria-label="Scroll left"
      >
        <FaArrowLeft />
      </button>

      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3 pr-[30%] sm:pr-4 no-scrollbar"
      >
        {isLoading || categoryData.length === 0
          ? Array.from({ length: 11 }).map((_, idx) => (
              <SkeletonCard key={`skeleton-${idx}`} />
            ))
          : categoryData.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHover(idx)}
                onMouseLeave={() => setHover(null)}
                className={`flex-shrink-0 w-28 sm:w-32 md:w-44 h-32 sm:h-36 bg-white rounded-lg shadow-md p-2 cursor-pointer
                  ${idx === categoryData.length - 1 ? "mr-[25%] sm:mr-0" : ""}`}
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
                  <img
                    className={`h-8 w-8 md:h-14 md:w-14 object-contain transition-all ${
                      hover === idx ? "scale-110" : "scale-100"
                    }`}
                    src={item.image}
                    alt={item.name}
                  />
                  <p className="text-sm font-medium text-center">{item.name}</p>
                </div>
              </div>
            ))}
      </div>

      <button
        onClick={() => scroll("right")}
        className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 bg-red-500 text-white rounded-full shadow-lg items-center justify-center hover:bg-red-300 hover:text-black cursor-pointer transition-all duration-200 ease-in ${
          arrowIcon ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
        }`}
        aria-label="Scroll right"
      >
        <FaArrowRight />
      </button>
    </div>
  );
};

export default HomeCatSlider;

const SkeletonCard = () => (
  <div className="flex-shrink-0 w-28 sm:w-32 md:w-44 h-32 sm:h-36 bg-gray-200 rounded-lg shadow-md p-2 animate-pulse">
    <div className="flex flex-col items-center justify-center h-full gap-3 w-full">
      <div className="h-8 w-8 md:h-14 md:w-14 bg-gray-300 rounded-full" />
      <div className="h-4 w-3/4 bg-gray-300 rounded" />
    </div>
  </div>
);
