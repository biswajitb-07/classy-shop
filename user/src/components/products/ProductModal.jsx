import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import AuthButtonLoader from "../Loader/AuthButtonLoader";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";

const ProductModal = ({
  product,
  onClose,
  onAddToCart,
  loading,
  updateQuantity,
  quantities,
}) => {
  const [mainImage, setMainImage] = useState(product.image?.[0] || "");
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");

  const [selectedRam, setSelectedRam] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");

  const isElectronics = product?.rams && product?.storage;
  const isFashionWithSizes = !isElectronics && product?.sizes?.length > 0;

  const handleMouseMove = (e) => {
    const { left, top, width, height } =
      e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setTransformOrigin(
      `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`
    );
  };

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

  const handleAddToCartWrapper = () => {
    if (isElectronics) {
      if (!selectedRam || !selectedStorage) {
        toast.error("Please select RAM and Storage");
        return;
      }
      onAddToCart(product, { ram: selectedRam, storage: selectedStorage });
    } else {
      onAddToCart(product, true);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 px-5">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black opacity-50"
      ></div>

      <div className="bg-white rounded-xl shadow-lg w-full max-w-7xl px-6 md:px-10 py-6 lg:py-10 overflow-y-auto max-h-[90vh] relative scrollbar-red">
        <div className="w-full flex justify-end">
          <button
            className="text-gray-500 hover:text-red-500 text-3xl md:text-4xl transition hover:rotate-90"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 md:gap-7">
          {/* thumbnails */}
          <div className="flex lg:flex-col gap-2 overflow-x-auto md:overflow-y-auto">
            {product.image?.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${product.name} ${idx}`}
                onClick={() => setMainImage(img)}
                className={`w-14 h-20 md:w-16 md:h-24 object-cover rounded cursor-pointer transition ${
                  mainImage === img
                    ? "opacity-100"
                    : "opacity-40 hover:opacity-80"
                }`}
              />
            ))}
          </div>

          {/* main image */}
          <div
            className="flex-1 flex justify-center items-center overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            <img
              src={mainImage}
              alt={product.name}
              style={{ transformOrigin }}
              className="max-h-[300px] md:max-h-[500px] object-cover object-top rounded transition-transform duration-300 hover:scale-[1.5] w-full"
            />
          </div>

          {/* details + add to cart */}
          <div className="flex-1 flex gap-3 flex-col">
            <h2 className="text-xl md:text-2xl font-bold">{product.name}</h2>
            <p className="text-xs md:text-sm text-gray-600">
              Brand: {product.brand}
            </p>
            {renderStars(product.rating)}
            <div className="flex items-center gap-3 md:gap-5 mt-2">
              <span className="text-red-600 font-bold text-lg">
                ₹{product.discountedPrice}
              </span>
              <span className="line-through text-gray-400 text-sm">
                ₹{product.originalPrice}
              </span>
              <span className="text-sm font-medium text-green-500">
                Stock: {product.inStock}
              </span>
            </div>
            <p className="mt-3 text-gray-700 text-xs md:text-sm">
              {product.description}
            </p>

            {/* Fashion sizes */}
            {isFashionWithSizes && (
              <div className="mt-3">
                <p className="text-sm font-semibold mb-2">
                  Sizes and Quantities:
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-1">
                  {product.sizes.map((size) => (
                    <div key={size} className="flex items-center gap-2 mb-2">
                      <span className="text-xs sm:text-sm bg-red-500 text-white py-2 px-3">
                        {size}
                      </span>
                      <div className="flex items-center gap-2 border rounded">
                        <button
                          className="px-2 py-1 hover:bg-gray-200"
                          onClick={() => updateQuantity(size, -1)}
                          disabled={(quantities[size] || 0) <= 0}
                        >
                          -
                        </button>
                        <span className="px-2 min-w-[2rem] text-center">
                          {quantities[size] || 0}
                        </span>
                        <button
                          className="px-2 py-1 hover:bg-gray-200"
                          onClick={() => updateQuantity(size, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Electronics RAM & Storage */}
            {isElectronics && (
              <>
                <div className="mt-3">
                  <span className="font-semibold">RAM:</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {product.rams.map((r) => (
                      <button
                        key={r}
                        onClick={() => setSelectedRam(r)}
                        className={`border px-3 py-1 text-sm rounded cursor-pointer transition ${
                          r === selectedRam
                            ? "bg-red-500 text-white"
                            : "hover:border-red-500"
                        }`}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3">
                  <span className="font-semibold">Storage:</span>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {product.storage.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedStorage(s)}
                        className={`border px-3 py-1 text-sm rounded cursor-pointer transition ${
                          s === selectedStorage
                            ? "bg-red-500 text-white"
                            : "hover:border-red-500"
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <button
              onClick={handleAddToCartWrapper}
              disabled={
                loading || (isElectronics && (!selectedRam || !selectedStorage))
              }
              className="mt-4 w-full bg-red-500 text-white py-2 md:py-3 rounded-md text-xs md:text-sm font-medium hover:bg-red-600 transition flex items-center justify-center gap-3 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <AuthButtonLoader />
              ) : (
                <>
                  <ShoppingCart size={18} /> ADD TO CART
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
