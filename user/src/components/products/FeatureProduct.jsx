import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import HomeProductCard from "./HomeProductCard";
import { useGetFashionItemsQuery } from "../../features/api/fashionApi";
import { useGetElectronicItemsQuery } from "../../features/api/electronicApi";

const FeatureProduct = () => {
  const productScrollRef = useRef(null);
  const [canScrollProductLeft, setCanScrollProductLeft] = useState(false);
  const [canScrollProductRight, setCanScrollProductRight] = useState(true);

  const { data: fashionData, isLoading: fashionLoading } =
    useGetFashionItemsQuery();
  const { data: electronicData, isLoading: electronicLoading } =
    useGetElectronicItemsQuery();

  const isLoading = fashionLoading || electronicLoading;


  const fashionItems = fashionData?.fashionItems?.slice(0, 10) || [];
  const electronicItems = electronicData?.electronicItems?.slice(0, 10) || [];

  const combinedProducts = [...fashionItems, ...electronicItems];
  const featureProducts = combinedProducts
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  // Check scrollability
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

  useEffect(() => {
    checkProductScrollability();
    const productContainer = productScrollRef.current;

    if (productContainer) {
      productContainer.addEventListener("scroll", checkProductScrollability);
    }
    window.addEventListener("resize", checkProductScrollability);

    return () => {
      if (productContainer) {
        productContainer.removeEventListener(
          "scroll",
          checkProductScrollability
        );
      }
      window.removeEventListener("resize", checkProductScrollability);
    };
  }, [featureProducts]);

  return (
    <section className="container mx-auto px-4 py-9">
      <div className="mb-6 w-full flex flex-col items-start justify-center">
        <h1 className="text-xl md:text-3xl font-semibold text-black">
          Feature Products
        </h1>
      </div>

      <div className="relative group">
        {/* Left Button */}
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

        {/* Right Button */}
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

        {/* Product List */}
        <div className="snap-start">
          <HomeProductCard
            productScrollRef={productScrollRef}
            products={featureProducts}
            isLoading={isLoading}
          />
        </div>
      </div>
    </section>
  );
};

export default FeatureProduct;
