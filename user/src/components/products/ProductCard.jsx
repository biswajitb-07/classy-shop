import React, { useState } from "react";
import { FaStar, FaStarHalfAlt, FaRegHeart } from "react-icons/fa";
import { BsArrowsFullscreen } from "react-icons/bs";
import { ShoppingCart } from "lucide-react";

const PAGE_SIZE = 15;

const ProductCard = ({ products = [], isLoading = false }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [mainImage, setMainImage] = useState("");
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");

  const renderStars = (rating) => {
    const stars = [];
    const val = rating ? Math.round(rating * 2) / 2 : 0;
    for (let i = 1; i <= 5; i++) {
      if (i <= val) stars.push(<FaStar key={i} className="text-yellow-500" />);
      else if (i - 0.5 === val)
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      else stars.push(<FaStar key={i} className="text-gray-300" />);
    }
    return <div className="flex gap-1 text-xs">{stars}</div>;
  };

  const openModal = (product) => {
    setSelectedProduct(product);
    setMainImage(product.image?.[0] || "");
  };

  const closeModal = () => {
    setSelectedProduct(null);
    setMainImage("");
  };

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setTransformOrigin(
      `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`
    );
  };

  if (isLoading) return <ProductCardSkeleton />;

  if (!products.length) {
    return (
      <div className="text-center py-10 text-gray-500">No products found.</div>
    );
  }

  return (
    <>
      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {products.map((p) => {
          const discount =
            p.originalPrice && p.discountedPrice
              ? Math.round(
                  ((p.originalPrice - p.discountedPrice) / p.originalPrice) *
                    100
                )
              : 0;
          return (
            <div
              key={p.id}
              className="relative bg-white shadow-md rounded-xl w-full cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="relative group overflow-hidden">
                <img
                  src={p.image[0]}
                  alt={p.name}
                  className="h-56 w-full object-cover object-top rounded-t-xl transition-opacity duration-700 ease-linear group-hover:opacity-0"
                />

                {p.image[1] && (
                  <img
                    src={p.image[1]}
                    alt={p.name}
                    className="absolute top-0 left-0 h-56 w-full object-cover object-top rounded-t-xl opacity-0 transition-opacity duration-700 ease-linear group-hover:opacity-100"
                  />
                )}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    {discount}%
                  </span>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button className="bg-white p-1.5 rounded-full shadow hover:bg-red-500 hover:text-white">
                    <FaRegHeart size={16} />
                  </button>
                  <button
                    className="bg-white p-1.5 rounded-full shadow hover:bg-red-500 hover:text-white"
                    onClick={() => openModal(p)}
                  >
                    <BsArrowsFullscreen size={16} />
                  </button>
                </div>
              </div>

              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-600">{p.brand}</p>
                <p className="text-sm truncate font-medium">{p.name}</p>
                {renderStars(p.rating)}
                <div className="flex items-center justify-between mt-1 text-sm">
                  <span className="text-red-600 font-bold">
                    ₹{p.discountedPrice}
                  </span>
                  <span className="line-through text-gray-400">
                    ₹{p.originalPrice}
                  </span>
                </div>
                <button className="mt-2 w-full bg-white border border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-3 rounded-md text-[13px] font-medium transition cursor-pointer flex items-center justify-center gap-5">
                  <ShoppingCart size={20} /> ADD TO CART
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-2">
          {/* Overlay */}
          <div
            onClick={closeModal}
            className="absolute inset-0 bg-black opacity-50"
          ></div>

          {/* Modal */}
          <div className="bg-white rounded-xl shadow-lg w-full max-w-7xl px-4 md:px-10 py-6 md:py-10 overflow-y-auto max-h-[95vh] relative">
            <div className="w-full flex justify-end items-center">
              <button
                className=" text-gray-500 hover:text-red-500 text-3xl md:text-4xl transition ease-linear duration-150 hover:rotate-90 cursor-pointer"
                onClick={closeModal}
              >
                &times;
              </button>
            </div>

            {/* Main content */}
            <div className="flex flex-col md:flex-row gap-5 md:gap-7">
              <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto">
                {selectedProduct.image?.map((img, idx) => {
                  const isSelected = mainImage === img;
                  return (
                    <img
                      key={idx}
                      src={img}
                      alt={`${selectedProduct.name} ${idx}`}
                      onClick={() => setMainImage(img)}
                      className={`w-14 h-20 md:w-16 md:h-24 object-cover rounded cursor-pointer transition ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-80"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Main Image */}
              <div
                className="flex-1 flex justify-center items-center overflow-hidden"
                onMouseMove={handleMouseMove}
              >
                <img
                  src={mainImage}
                  alt={selectedProduct.name}
                  style={{ transformOrigin }}
                  className="max-h-[300px] md:max-h-[500px] object-cover object-top rounded transition-transform duration-300 ease-in-out hover:scale-[1.5] w-full"
                />
              </div>

              {/* Details */}
              <div className="flex-1 flex gap-3 flex-col">
                <h2 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                  Brand: {selectedProduct.brand}
                </p>
                {renderStars(selectedProduct.rating)}
                <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-2">
                  <span className="text-red-600 font-bold text-lg">
                    ₹{selectedProduct.discountedPrice}
                  </span>
                  <span className="line-through text-gray-400 text-sm">
                    ₹{selectedProduct.originalPrice}
                  </span>
                  <div className="text-gray-600 flex gap-1 md:gap-2 items-center">
                    <span className="text-sm md:text-base">
                      Available Stock:
                    </span>
                    <span className="text-sm md:text-base font-medium text-green-500">
                      {selectedProduct.inStock}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-gray-700 text-xs md:text-sm tracking-widest">
                  {selectedProduct.description ||
                    "This is a beautiful product perfect for your style."}
                </p>

                {/* Size Buttons */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {["S", "M", "L"].map((size) => (
                    <button
                      key={size}
                      className="px-3 py-2 text-sm border rounded hover:bg-red-500 hover:text-white"
                    >
                      {size}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-gray-700 text-xs md:text-sm tracking-widest">
                  {selectedProduct.shippingInfo}
                </p>

                {/* Add to Cart */}
                <button className="mt-4 w-full bg-red-500 text-white py-2 md:py-3 rounded-md text-xs md:text-[13px] font-medium hover:bg-red-600 transition flex items-center justify-center gap-3">
                  <ShoppingCart size={18} /> ADD TO CART
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;

const ProductCardSkeleton = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow animate-pulse">
          <div className="h-48 bg-gray-200 rounded-t-xl" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
