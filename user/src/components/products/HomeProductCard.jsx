import { ShoppingCart } from "lucide-react";
import { FaRegHeart, FaHeart, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { BsArrowsFullscreen } from "react-icons/bs";
import { IoShareSocialOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "react-hot-toast";
import {
  useAddToCartMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useGetWishlistQuery,
} from "../../features/api/cartApi";
import AuthButtonLoader from "../Loader/AuthButtonLoader";
import ProductModal from "./ProductModal";
import { useSelector } from "react-redux";

const HomeProductCard = ({ productScrollRef, products, isLoading }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartLoadingId, setCartLoadingId] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [modalCartLoading, setModalCartLoading] = useState(false);

  const { isAuthenticated } = useSelector((s) => s.auth);

  const navigate = useNavigate();
  const [addToCart] = useAddToCartMutation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { data: wishlistData } = useGetWishlistQuery();
  const wishlistItems = wishlistData?.wishlist || [];

  const isInWishlist = (productId) =>
    wishlistItems.some((item) => item.productId === productId);

  const openModal = (product) => {
    setSelectedProduct(product);
    setQuantities({});
  };
  const closeModal = () => setSelectedProduct(null);

  const updateQuantity = (size, delta) =>
    setQuantities((prev) => {
      const newQ = (prev[size] || 0) + delta;
      return newQ < 0 ? prev : { ...prev, [size]: newQ };
    });

  const renderStars = (rating) => {
    const val = rating ? Math.round(rating * 2) / 2 : 0;
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= val) stars.push(<FaStar key={i} className="text-yellow-500" />);
      else if (i - 0.5 === val)
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
      else stars.push(<FaStar key={i} className="text-gray-300" />);
    }
    return <div className="flex gap-1 text-xs">{stars}</div>;
  };

  const handleToggleWishlist = async (product) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }

    const productType = product.category;
    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist({
          productId: product._id,
          productType,
        }).unwrap();
        toast.success("Removed from wishlist!");
      } else {
        await addToWishlist({ productId: product._id, productType }).unwrap();
        toast.success("Added to wishlist!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Wishlist update failed");
    }
  };

  const handleAddToCart = async (product, options = false) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }

    let fromModal = false;
    let ram, storage;
    if (typeof options === "boolean") {
      fromModal = options;
    } else if (typeof options === "object") {
      fromModal = true;
      ram = options.ram;
      storage = options.storage;
    }

    const productType = product.category;

    if (productType === "Electronics") {
      if (!fromModal) {
        openModal(product);
        return;
      }
      setModalCartLoading(true);
      try {
        if (!ram || !storage) {
          toast.error("Select RAM & Storage");
          return;
        }
        if (1 > product.inStock) {
          toast.error(`Only ${product.inStock} items available`);
          return;
        }
        await addToCart({
          productId: product._id,
          productType,
          quantity: 1,
          ram,
          storage,
        }).unwrap();
        toast.success("Added to cart!");
        closeModal();
      } catch (err) {
        toast.error(err?.data?.message || "Failed to add");
      } finally {
        setModalCartLoading(false);
      }
      return;
    }
    if (productType === "Fashion") {
      if (product.sizes?.length > 0) {
        if (!fromModal) {
          openModal(product);
          return;
        }
        setModalCartLoading(true);
        try {
          const selectedSizes = Object.keys(quantities).filter(
            (s) => quantities[s] > 0
          );
          if (selectedSizes.length === 0) {
            toast.error("Please select size & quantity");
            return;
          }
          for (const size of selectedSizes) {
            if (quantities[size] > product.inStock) {
              toast.error(
                `Only ${product.inStock} items left for size ${size}`
              );
              return;
            }
            await addToCart({
              productId: product._id,
              productType,
              quantity: quantities[size],
              size,
            }).unwrap();
          }
          toast.success("Added to cart!");
          setQuantities({});
          closeModal();
        } catch (err) {
          toast.error(err?.data?.message || "Failed to add");
        } finally {
          setModalCartLoading(false);
        }
        return;
      }

      setCartLoadingId(product._id);
      try {
        if (1 > product.inStock) {
          toast.error(`Only ${product.inStock} items available`);
          return;
        }
        await addToCart({
          productId: product._id,
          productType,
          quantity: 1,
          size: null,
        }).unwrap();
        toast.success("Added to cart!");
      } catch (err) {
        console.log(err);
        toast.error(err?.data?.message || "Failed to add");
      } finally {
        setCartLoadingId(null);
      }
    }
  };

  const handleShare = async (product, e) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}/${product.category.toLowerCase()}/${product.category.toLowerCase()}-product-details/${product._id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out this amazing product: ${product.name}`,
          url: productUrl,
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(productUrl);
        toast.success("Product link copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast.error("Failed to copy link");
      }
    }
  };
  
  return (
    <>
      <div
        ref={productScrollRef}
        className="flex space-x-4 overflow-x-scroll scroll-smooth pb-4 touch-pan-x snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {isLoading || products.length === 0 ? (
          <div className="flex gap-5">
            {Array(5)
              .fill("")
              .map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
          </div>
        ) : (
          products?.map((p) => {
            const discount =
              p.originalPrice && p.discountedPrice
                ? Math.round(
                    ((p.originalPrice - p.discountedPrice) / p.originalPrice) *
                      100
                  )
                : 0;
            const inWishlist = isInWishlist(p._id);

            return (
              <div
                key={p._id}
                className="relative bg-white shadow-md rounded-xl w-64 flex-shrink-0 cursor-pointer group/card hover:shadow-lg transition-shadow"
              >
                {/* images */}
                <div className="relative overflow-hidden rounded-t-xl">
                  <img
                    onClick={() =>
                      navigate(
                        `/${p.category.toLowerCase()}/${p.category.toLowerCase()}-product-details/${
                          p._id
                        }`
                      )
                    }
                    src={p.image?.[0] || "/fallback-image.jpg"}
                    alt={p.name}
                    className="h-56 w-full object-cover object-top transition-opacity duration-700 ease-linear group-hover/card:opacity-0"
                  />

                  {p.image?.[1] && (
                    <img
                      onClick={() =>
                        navigate(
                          `/${p.category.toLowerCase()}/${p.category.toLowerCase()}-product-details/${
                            p._id
                          }`
                        )
                      }
                      src={p.image[1]}
                      alt={p.name}
                      className="absolute inset-0 h-56 w-full object-cover object-top opacity-0 transition-opacity duration-700 ease-linear group-hover/card:opacity-100"
                    />
                  )}

                  {discount > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      {discount}%
                    </span>
                  )}

                  <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-100 lg:opacity-0 transition-opacity group-hover/card:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleWishlist(p);
                      }}
                      className={`p-2 rounded-full shadow hover:scale-110 transition cursor-pointer ${
                        inWishlist
                          ? "bg-red-500 text-white"
                          : "bg-white hover:bg-red-500 hover:text-white"
                      }`}
                      aria-label={
                        inWishlist ? "Remove from wishlist" : "Add to wishlist"
                      }
                    >
                      {inWishlist ? (
                        <FaHeart size={16} />
                      ) : (
                        <FaRegHeart size={16} />
                      )}
                    </button>

                    {(p.category === "Fashion" && p.sizes?.length > 0) ||
                    p.category === "Electronics" ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(p);
                        }}
                        className="bg-white p-2 rounded-full shadow hover:scale-110 transition cursor-pointer"
                        aria-label="Quick view"
                      >
                        <BsArrowsFullscreen size={16} />
                      </button>
                    ) : null}

                    <button
                      onClick={(e) => handleShare(p, e)}
                      className="bg-white p-2 rounded-full shadow hover:scale-110 hover:bg-red-500 hover:text-white transition cursor-pointer"
                      aria-label="Share product"
                    >
                      <IoShareSocialOutline size={16} />
                    </button>
                  </div>
                </div>

                {/* info */}
                <div
                  onClick={() =>
                    navigate(
                      `/${p.category.toLowerCase()}/${p.category.toLowerCase()}-product-details/${
                        p._id
                      }`
                    )
                  }
                  className="p-4"
                >
                  <p className="text-sm font-semibold text-gray-600">
                    {p.brand}
                  </p>
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <div className="mt-1">{renderStars(p.rating)}</div>

                  <div className="mt-2 text-sm flex justify-between items-center">
                    <span className="line-through text-gray-400">
                      ₹{p.originalPrice}
                    </span>
                    <span className="text-red-600 font-semibold">
                      ₹{p.discountedPrice}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Stock: <span className="text-red-500">{p.inStock}</span>
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(p);
                    }}
                    disabled={cartLoadingId === p._id}
                    className="mt-4 w-full bg-white border border-red-500 text-red-500 hover:bg-red-500 cursor-pointer hover:text-white py-3 rounded-md text-[13px] font-medium transition flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {cartLoadingId === p._id ? (
                      <AuthButtonLoader />
                    ) : (
                      <>
                        <ShoppingCart size={18} /> ADD TO CART
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={closeModal}
          onAddToCart={handleAddToCart}
          loading={modalCartLoading}
          updateQuantity={updateQuantity}
          quantities={quantities}
        />
      )}
    </>
  );
};

export default HomeProductCard;

const SkeletonCard = () => (
  <div className="relative bg-white shadow-md rounded-xl w-64 flex-shrink-0 animate-pulse">
    <div className="h-56 w-full bg-gray-400 rounded-t-xl" />
    <div className="absolute top-2 left-2 h-5 w-10 bg-gray-400 rounded" />
    <div className="p-4">
      <div className="h-3 w-20 bg-gray-400 rounded mb-2" />
      <div className="h-3 w-40 bg-gray-400 rounded mb-3" />
      <div className="flex gap-1 mb-3">
        {Array(5)
          .fill("")
          .map((_, i) => (
            <div key={i} className="h-3 w-3 bg-gray-400 rounded-full" />
          ))}
      </div>
      <div className="flex justify-between mb-4">
        <div className="h-3 w-12 bg-gray-400 rounded" />
        <div className="h-3 w-12 bg-gray-400 rounded" />
      </div>
      <div className="h-10 w-full bg-gray-400 rounded-md" />
    </div>
  </div>
);