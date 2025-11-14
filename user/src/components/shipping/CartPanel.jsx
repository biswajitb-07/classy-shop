import { useState, useEffect } from "react";
import {
  X,
  Trash2,
  ShoppingBag,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageLoader from "../Loader/PageLoader";
import AuthButtonLoader from "../Loader/AuthButtonLoader";
import {
  useGetCartQuery,
  useRemoveFromCartMutation,
  useUpdateCartQuantityMutation,
} from "../../features/api/cartApi";
import { toast } from "react-hot-toast";

const CartPanel = ({ openCartPanel, isOpenCartPanel }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const { data: cartData, isLoading, isError } = useGetCartQuery();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [updateCartQuantity] = useUpdateCartQuantityMutation();

  const cart = cartData?.cart || [];

  useEffect(() => {
    const root = document.documentElement;
    if (isOpenCartPanel) {
      root.classList.add("overflow-hidden");
    } else {
      root.classList.remove("overflow-hidden");
    }
    return () => root.classList.remove("overflow-hidden");
  }, [isOpenCartPanel]);

  const startLoading = (type, productId, variant, action = "") => {
    const key = `${type}_${productId}_${variant ?? "null"}${
      action ? `_${action}` : ""
    }`;
    setLoading((prev) => ({ ...prev, [key]: true }));
  };

  const stopLoading = (type, productId, variant, action = "") => {
    const key = `${type}_${productId}_${variant ?? "null"}${
      action ? `_${action}` : ""
    }`;
    setLoading((prev) => ({ ...prev, [key]: false }));
  };

  const handleRemoveFromCart = async (item) => {
    const { productId, productType, variant } = item;
    startLoading("remove", productId, variant);
    try {
      await removeFromCart({
        productId,
        productType,
        variant: variant || null,
      }).unwrap();
      toast.success("Product removed");
    } catch (error) {
      toast.error("Failed to remove product");
      console.error("Failed to remove from cart:", error);
    } finally {
      stopLoading("remove", productId, variant);
    }
  };

  const handleUpdateQuantity = async (
    productId,
    productType,
    variant,
    newQuantity,
    action
  ) => {
    if (newQuantity < 1) return;
    startLoading("update", productId, variant, action);
    try {
      await updateCartQuantity({
        productId,
        productType,
        quantity: newQuantity,
        variant: variant || null,
      }).unwrap();
    } catch (error) {
      toast.error("Failed to update quantity");
      console.error("Failed to update quantity:", error);
    } finally {
      stopLoading("update", productId, variant, action);
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce(
      (total, group) =>
        total +
        group.variants.reduce(
          (sub, v) => sub + group.product.discountedPrice * v.quantity,
          0
        ),
      0
    );
  };

  const getVariantDisplay = (productType, variant) => {
    if (!variant || variant === "default") return null;

    if (productType === "Fashion") {
      const [key, value] = variant.split(":");
      if (key === "size" && value) {
        return `Size: ${value}`;
      }
      return null;
    } else if (productType === "Electronics") {
      const pairs = variant.split("|").map((pair) => pair.split(":"));
      const ram = pairs.find(([key]) => key === "ram")?.[1];
      const storage = pairs.find(([key]) => key === "storage")?.[1];
      const displayParts = [];
      if (ram) displayParts.push(`${ram} RAM`);
      if (storage) displayParts.push(`${storage} Storage`);
      return displayParts.length > 0 ? displayParts.join(" • ") : null;
    }
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-all duration-500 ease-out
          ${isOpenCartPanel ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={openCartPanel}
      />

      {/* Cart Panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full md:w-[28rem]
          bg-gradient-to-br from-white via-gray-50 to-gray-100
          shadow-2xl transform transition-all duration-500 ease-out overflow-hidden
          ${isOpenCartPanel ? "translate-x-0" : "translate-x-full"}
          border-l border-gray-200`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <ShoppingBag size={16} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-wide">
                    Shopping Cart
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80">
                    {cart.length} items
                  </p>
                </div>
              </div>
              <button
                onClick={openCartPanel}
                aria-label="Close cart panel"
                className="p-1.5 sm:p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300 
                         hover:rotate-90 hover:scale-110 backdrop-blur-sm cursor-pointer"
              >
                <X size={16} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid place-items-center h-full">
              <PageLoader message="Loading cart item" />
            </div>
          ) : cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="p-6 sm:p-8 bg-white rounded-full shadow-lg mb-4 sm:mb-6">
                <ShoppingCart
                  size={40}
                  className="sm:w-12 sm:h-12 text-gray-400"
                />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-2 text-center">
                Your cart is empty
              </h3>
              <p className="text-sm sm:text-base text-gray-500 text-center mb-6 sm:mb-8 leading-relaxed px-2">
                Discover amazing products and add them to your cart
              </p>
              <button
                onClick={() => {
                  openCartPanel();
                  setTimeout(() => navigate("/"), 300);
                }}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold 
                         rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300
                         hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 scrollbar-hide">
                <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
                  {cart.map((group) => (
                    <div
                      key={group.product._id}
                      className="bg-white rounded-lg sm:rounded-xl shadow-sm hover:shadow-md transition-all duration-300 
                               overflow-hidden border border-gray-200 hover:border-purple-200
                               transform hover:-translate-y-1 cursor-pointer"
                      onClick={() => {
                        navigate(
                          `/${group.productType.toLowerCase()}/${group.productType.toLowerCase()}-product-details/${
                            group.product._id
                          }`
                        );
                        openCartPanel();
                      }}
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex gap-3 sm:gap-4">
                          {/* Product Image */}
                          <div className="relative group flex-shrink-0">
                            <img
                              src={
                                group.product.image?.[0] ||
                                "/fallback-image.jpg"
                              }
                              alt={group.product.name}
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm 
                                       group-hover:scale-105 transition-transform duration-300"
                            />
                            <div
                              className="absolute inset-0 bg-black/0 group-hover:bg-black/10 
                                          rounded-lg transition-colors duration-300"
                            ></div>
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Product Name */}
                            <h4 className="font-semibold text-gray-800 mb-2 leading-tight line-clamp-2 text-sm sm:text-base">
                              {group.product.name}
                            </h4>

                            {group.variants.map((v, index) => {
                              const variantDisplay = getVariantDisplay(
                                group.productType,
                                v.variant
                              );
                              const removeKey = `remove_${group.product._id}_${
                                v.variant ?? "null"
                              }`;
                              const minusKey = `update_${group.product._id}_${
                                v.variant ?? "null"
                              }_minus`;
                              const plusKey = `update_${group.product._id}_${
                                v.variant ?? "null"
                              }_plus`;

                              return (
                                <div
                                  key={index}
                                  className="space-y-2 sm:space-y-3"
                                >
                                  {variantDisplay && (
                                    <div
                                      className="inline-flex px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-purple-100 to-pink-100 
                                                  text-purple-700 text-xs font-medium rounded-full"
                                    >
                                      {variantDisplay}
                                    </div>
                                  )}

                                  <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                                    <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                                      {/* Quantity controls */}
                                      <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 rounded-lg p-0.5 sm:p-1">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateQuantity(
                                              group.product._id,
                                              group.productType,
                                              v.variant,
                                              v.quantity - 1,
                                              "minus"
                                            );
                                          }}
                                          disabled={
                                            v.quantity <= 1 || loading[minusKey]
                                          }
                                          aria-label="Decrease quantity"
                                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md
                                                   hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed
                                                   transition-colors duration-200 hover:text-red-600 shadow-sm cursor-pointer"
                                        >
                                          {loading[minusKey] ? (
                                            <AuthButtonLoader />
                                          ) : (
                                            <Minus
                                              size={14}
                                              className="sm:w-4 sm:h-4"
                                            />
                                          )}
                                        </button>

                                        <span className="w-6 sm:w-8 text-center font-semibold text-gray-700 text-sm sm:text-base">
                                          {v.quantity}
                                        </span>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUpdateQuantity(
                                              group.product._id,
                                              group.productType,
                                              v.variant,
                                              v.quantity + 1,
                                              "plus"
                                            );
                                          }}
                                          disabled={loading[plusKey]}
                                          aria-label="Increase quantity"
                                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-md
                                                   hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed
                                                   transition-colors duration-200 hover:text-green-600 shadow-sm cursor-pointer"
                                        >
                                          {loading[plusKey] ? (
                                            <AuthButtonLoader />
                                          ) : (
                                            <Plus
                                              size={14}
                                              className="sm:w-4 sm:h-4"
                                            />
                                          )}
                                        </button>
                                      </div>

                                      {/* Price */}
                                      <div className="text-right">
                                        <p
                                          className="text-base sm:text-lg font-bold text-transparent bg-clip-text 
                                                    bg-gradient-to-r from-purple-600 to-pink-600"
                                        >
                                          ₹
                                          {(
                                            group.product.discountedPrice *
                                            v.quantity
                                          ).toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          ₹
                                          {group.product.discountedPrice.toLocaleString()}{" "}
                                          each
                                        </p>
                                      </div>
                                    </div>

                                    {/* Remove Button */}
                                    <div className="flex justify-end sm:justify-start">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveFromCart({
                                            productId: group.product._id,
                                            productType: group.productType,
                                            variant: v.variant,
                                          });
                                        }}
                                        disabled={loading[removeKey]}
                                        aria-label="Remove from cart"
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 
                                                 rounded-lg transition-all duration-200 disabled:cursor-not-allowed
                                                 hover:scale-110 cursor-pointer"
                                      >
                                        {loading[removeKey] ? (
                                          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                          <Trash2
                                            size={16}
                                            className="sm:w-[18px] sm:h-[18px]"
                                          />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom section */}
                <div className="bg-white border-t border-gray-200 p-3 sm:p-4 md:p-5 pb-6 sm:pb-4">
                  <div className="flex justify-between items-center mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                    <span className="text-base sm:text-lg font-semibold text-gray-700">
                      Subtotal
                    </span>
                    <span
                      className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text 
                                 bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      ₹{calculateSubtotal().toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <button
                      onClick={() => {
                        openCartPanel();
                        setTimeout(() => navigate("/cart"), 300);
                      }}
                      className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                             font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] 
                             transition-all duration-300 hover:from-purple-700 hover:to-pink-700 cursor-pointer
                             text-sm sm:text-base"
                    >
                      View Full Cart
                    </button>

                    <button
                      onClick={() => {
                        openCartPanel();
                        setTimeout(() => navigate("/checkout"), 300);
                      }}
                      className="w-full py-3 sm:py-4 bg-white text-gray-700 font-semibold rounded-xl 
                             border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50
                             transition-all duration-300 hover:scale-[1.02] cursor-pointer
                             text-sm sm:text-base"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
};

export default CartPanel;
