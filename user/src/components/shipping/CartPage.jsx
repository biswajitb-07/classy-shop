import { FaTrashCan } from "react-icons/fa6";
import { FaShoppingBag } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import {
  useGetCartQuery,
  useRemoveFromCartMutation,
  useUpdateCartQuantityMutation,
} from "../../features/api/cartApi";
import PageLoader from "../../components/Loader/PageLoader";
import AuthButtonLoader from "../../components/Loader/AuthButtonLoader";
import { toast } from "react-hot-toast";
import { useEffect, useState } from "react";
import ErrorMessage from "../error/ErrorMessage";

const CartPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState({});

  const { data: cartData, isLoading, isError, refetch } = useGetCartQuery();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [updateCartQuantity] = useUpdateCartQuantityMutation();

  const cart = cartData?.cart || [];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const startLoading = (type, productId, variant, action) => {
    const variantKey = variant || "null";
    const key = action
      ? `${type}_${productId}_${variantKey}_${action}`
      : `${type}_${productId}_${variantKey}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
  };

  const stopLoading = (type, productId, variant, action) => {
    const variantKey = variant || "null";
    const key = action
      ? `${type}_${productId}_${variantKey}_${action}`
      : `${type}_${productId}_${variantKey}`;
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
    } catch (err) {
      toast.error("Failed to remove product");
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
    } catch (err) {
      toast.error("Failed to update quantity");
    } finally {
      stopLoading("update", productId, variant, action);
    }
  };

  const calculateSubtotal = () =>
    cart.reduce(
      (total, group) =>
        total +
        group.variants.reduce(
          (sub, v) => sub + group.product.discountedPrice * v.quantity,
          0
        ),
      0
    );

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
      if (ram) displayParts.push(`RAM: ${ram}`);
      if (storage) displayParts.push(`Storage: ${storage}`);
      return displayParts.length > 0 ? displayParts.join(", ") : null;
    }
    return null;
  };

  if (isError) return <ErrorMessage onRetry={refetch}/>;

  if (isLoading)
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <PageLoader message="Loading your cart..." />
        </div>
      </div>
    );

  if (!cart.length)
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
              <FaShoppingBag className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Discover amazing products and start shopping!
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );

  const totalItems = cart.reduce(
    (total, group) =>
      total + group.variants.reduce((sub, v) => sub + v.quantity, 0),
    0
  );

  const tableItems = cart.flatMap((group) =>
    group.variants.map((variant) => ({
      ...group,
      variant: variant.variant,
      quantity: variant.quantity,
      variantDisplay: getVariantDisplay(group.productType, variant.variant),
    }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[7rem]">
      <div className="container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaShoppingBag className="text-red-500" />
              Shopping Cart
            </h1>
            <div className="bg-white px-4 py-2 rounded-full shadow-md">
              <span className="text-sm text-gray-600 font-medium">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full"></div>
        </div>

        <div className="grid lg:grid-cols-6 gap-8">
          {/* Cart Table */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-lg overflow-y-auto">
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-40">
                        Variant
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Remove
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {tableItems.map((item, index) => {
                      const minusKey = `update_${item.productId}_${
                        item.variant || "null"
                      }_minus`;
                      const plusKey = `update_${item.productId}_${
                        item.variant || "null"
                      }_plus`;
                      const removeKey = `remove_${item.productId}_${
                        item.variant || "null"
                      }`;

                      return (
                        <tr
                          key={`${item.productId}_${
                            item.variant || "default"
                          }_${index}`}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Product Column */}
                          <td className="px-6 py-6">
                            <div
                              className="flex items-center gap-4 cursor-pointer group"
                              onClick={() =>
                                navigate(
                                  `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                                    item.product._id
                                  }`
                                )
                              }
                            >
                              <div className="relative">
                                <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                                  <img
                                    src={
                                      item.product.image?.[0] ||
                                      "/fallback-image.jpg"
                                    }
                                    alt={item.product.name}
                                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                                  />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800 group-hover:text-red-500 transition-colors truncate">
                                  {item.product.name}
                                </h3>
                                <span className="inline-block bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium mt-1">
                                  {item.productType}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Variant Column */}
                          <td className="px-6 py-6 min-w-40">
                            {item.variantDisplay ? (
                              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200 whitespace-nowrap">
                                {item.variantDisplay}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                Default
                              </span>
                            )}
                          </td>

                          {/* Quantity Column */}
                          <td className="px-6 py-6">
                            <div className="flex items-center justify-center">
                              <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                <button
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.productId,
                                      item.productType,
                                      item.variant,
                                      item.quantity - 1,
                                      "minus"
                                    )
                                  }
                                  disabled={
                                    item.quantity <= 1 || loading[minusKey]
                                  }
                                  className="px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                                >
                                  {loading[minusKey] ? (
                                    <AuthButtonLoader />
                                  ) : (
                                    "−"
                                  )}
                                </button>
                                <span className="px-4 py-2 font-bold text-gray-800 bg-white min-w-[3rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    handleUpdateQuantity(
                                      item.productId,
                                      item.productType,
                                      item.variant,
                                      item.quantity + 1,
                                      "plus"
                                    )
                                  }
                                  disabled={loading[plusKey]}
                                  className="px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                                >
                                  {loading[plusKey] ? (
                                    <AuthButtonLoader />
                                  ) : (
                                    "+"
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Price Column */}
                          <td className="px-6 py-6 text-right">
                            <div>
                              <p className="text-lg font-bold text-red-500">
                                ₹
                                {(
                                  item.product.discountedPrice * item.quantity
                                ).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                ₹{item.product.discountedPrice.toLocaleString()}{" "}
                                each
                              </p>
                            </div>
                          </td>

                          {/* Remove Column */}
                          <td className="px-6 py-6 text-center">
                            <button
                              onClick={() =>
                                handleRemoveFromCart({
                                  productId: item.productId,
                                  productType: item.productType,
                                  variant: item.variant,
                                })
                              }
                              disabled={loading[removeKey]}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:cursor-not-allowed cursor-pointer group"
                            >
                              {loading[removeKey] ? (
                                <AuthButtonLoader />
                              ) : (
                                <FaTrashCan
                                  size={16}
                                  className="group-hover:scale-110 transition-transform"
                                />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-100">
                {tableItems.map((item, index) => {
                  const minusKey = `update_${item.productId}_${
                    item.variant || "null"
                  }_minus`;
                  const plusKey = `update_${item.productId}_${
                    item.variant || "null"
                  }_plus`;
                  const removeKey = `remove_${item.productId}_${
                    item.variant || "null"
                  }`;

                  return (
                    <div
                      key={`${item.productId}_${
                        item.variant || "default"
                      }_${index}`}
                      className="p-4"
                    >
                      <div
                        onClick={() =>
                          navigate(
                            `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                              item.product._id
                            }`
                          )
                        }
                        className="flex gap-4 cursor-pointer group mb-4"
                      >
                        <div className="relative">
                          <div className="w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                            <img
                              src={
                                item.product.image?.[0] || "/fallback-image.jpg"
                              }
                              alt={item.product.name}
                              className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 group-hover:text-red-500 transition-colors">
                            {item.product.name}
                          </h3>
                          <div className="flex gap-2 mt-1">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                              {item.productType}
                            </span>
                            {item.variantDisplay && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium border border-blue-200 whitespace-nowrap">
                                {item.variantDisplay}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.productType,
                                item.variant,
                                item.quantity - 1,
                                "minus"
                              )
                            }
                            disabled={item.quantity <= 1 || loading[minusKey]}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                          >
                            {loading[minusKey] ? <AuthButtonLoader /> : "−"}
                          </button>
                          <span className="px-4 py-2 font-bold text-gray-800 bg-white min-w-[3rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              handleUpdateQuantity(
                                item.productId,
                                item.productType,
                                item.variant,
                                item.quantity + 1,
                                "plus"
                              )
                            }
                            disabled={loading[plusKey]}
                            className="px-3 py-2 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                          >
                            {loading[plusKey] ? <AuthButtonLoader /> : "+"}
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-500">
                              ₹
                              {(
                                item.product.discountedPrice * item.quantity
                              ).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              ₹{item.product.discountedPrice.toLocaleString()}{" "}
                              each
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              handleRemoveFromCart({
                                productId: item.productId,
                                productType: item.productType,
                                variant: item.variant,
                              })
                            }
                            disabled={loading[removeKey]}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loading[removeKey] ? (
                              <AuthButtonLoader />
                            ) : (
                              <FaTrashCan size={16} />
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

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Order Summary
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Items ({totalItems})</span>
                    <span>₹{calculateSubtotal().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="text-green-500 font-medium">Free</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-xl font-bold text-gray-800">
                    <span>Total</span>
                    <span className="text-red-500">
                      ₹{calculateSubtotal().toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate("/checkout")}
                    className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
                  >
                    Proceed to Checkout
                  </button>

                  <button
                    onClick={() => navigate("/")}
                    className="w-full border-2 border-gray-200 hover:border-red-500 text-gray-700 hover:text-red-500 font-semibold py-3 px-6 rounded-xl transition-all duration-300 cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>

                {/* Trust Indicators */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Secure Payment
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Free Returns
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
