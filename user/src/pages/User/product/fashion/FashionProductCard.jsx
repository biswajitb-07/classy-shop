import { useEffect, useState } from "react";
import { FaStar, FaStarHalfAlt, FaRegHeart, FaHeart } from "react-icons/fa";
import { BsArrowsFullscreen } from "react-icons/bs";
import { IoShareSocialOutline } from "react-icons/io5";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useAddToCartMutation,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useGetWishlistQuery,
} from "../../../../features/api/cartApi.js";
import AuthButtonLoader from "../../../../components/Loader/AuthButtonLoader.jsx";
import ErrorMessage from "../../../../components/error/ErrorMessage.jsx";
import ProductModal from "../../../../components/products/ProductModal.jsx";
import { useSelector } from "react-redux";

const PAGE_SIZE = 15;

const FashionProductCard = ({ products = [], isLoading = false }) => {
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

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.productId === productId);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (selectedProduct) {
      root.classList.add("overflow-hidden");
    } else {
      root.classList.remove("overflow-hidden");
    }
    return () => root.classList.remove("overflow-hidden");
  }, [selectedProduct]);

  const handleAddToCart = async (product, isModal = false) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }

    if (isModal) {
      setModalCartLoading(true);
      try {
        const selectedSizes = Object.keys(quantities).filter(
          (s) => quantities[s] > 0
        );
        if (product.sizes?.length > 0 && selectedSizes.length === 0) {
          toast.error("Please select a size and quantity");
          setModalCartLoading(false);
          return;
        }
        for (const size of selectedSizes) {
          await addToCart({
            productId: product._id,
            productType: "Fashion",
            quantity: quantities[size],
            size,
          }).unwrap();
        }
        if (!product.sizes?.length) {
          await addToCart({
            productId: product._id,
            productType: "Fashion",
            quantity: 1,
            size: null,
          }).unwrap();
        }
        toast.success("Product added to cart!");
        setQuantities({});
        closeModal();
      } catch (error) {
        console.log(error);
        toast.error("Failed to add to cart");
        console.error(error);
      } finally {
        setModalCartLoading(false);
      }
    } else {
      if (product.sizes?.length > 0) {
        openModal(product);
      } else {
        setCartLoadingId(product._id);
        try {
          await addToCart({
            productId: product._id,
            productType: "Fashion",
            quantity: 1,
            size: null,
          }).unwrap();
          toast.success("Product added to cart!");
        } catch (error) {
          toast.error("Failed to add to cart");
        } finally {
          setCartLoadingId(null);
        }
      }
    }
  };

  const updateQuantity = (size, delta) => {
    setQuantities((prev) => {
      const newQ = (prev[size] || 0) + delta;
      return newQ < 0 ? prev : { ...prev, [size]: newQ };
    });
  };

  const handleToggleWishlist = async (product) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }

    try {
      if (isInWishlist(product._id)) {
        await removeFromWishlist({
          productId: product._id,
          productType: "Fashion",
        }).unwrap();
        toast.success("Product removed from wishlist!");
      } else {
        await addToWishlist({
          productId: product._id,
          productType: "Fashion",
        }).unwrap();
        toast.success("Product added to wishlist!");
      }
    } catch (error) {
      toast.error("Failed to update wishlist");
      console.error(error);
    }
  };

  const handleShare = async (product, e) => {
    e.stopPropagation();
    const productUrl = `${window.location.origin}/fashion/fashion-product-details/${product._id}`;

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
    setQuantities({});
  };
  const closeModal = () => setSelectedProduct(null);

  if (isLoading) return <FashionProductCardSkeleton />;
  if (!products)
    return (
      <ErrorMessage message="Product not found" onRetry={() => navigate(-1)} />
    );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
        {products.map((p) => {
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
              className="relative bg-white shadow-md rounded-xl w-full cursor-pointer hover:shadow-lg transition-shadow"
            >
              {/* images */}
              <div className="relative group overflow-hidden">
                <img
                  onClick={() =>
                    navigate(`/fashion/fashion-product-details/${p._id}`)
                  }
                  src={p.image[0]}
                  alt={p.name}
                  className="h-36 md:h-56 w-full object-cover object-top rounded-t-xl transition-opacity duration-700 ease-linear group-hover:opacity-0"
                />
                {p.image[1] && (
                  <img
                    onClick={() =>
                      navigate(`/fashion/fashion-product-details/${p._id}`)
                    }
                    src={p.image[1]}
                    alt={p.name}
                    className="absolute top-0 left-0 h-36 md:h-56 w-full object-cover object-top rounded-t-xl opacity-0 transition-opacity duration-700 ease-linear group-hover:opacity-100"
                  />
                )}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    {discount}%
                  </span>
                )}
                <div className="absolute top-2 right-2 flex flex-col gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleToggleWishlist(p)}
                    className={`p-1.5 rounded-full shadow hover:scale-110 hover:bg-red-500 hover:text-white transition cursor-pointer ${
                      inWishlist ? "bg-red-500 text-white" : "bg-white"
                    }`}
                  >
                    {inWishlist ? (
                      <FaHeart size={16} />
                    ) : (
                      <FaRegHeart size={16} />
                    )}
                  </button>
                  <button
                    className="bg-white p-1.5 rounded-full shadow hover:bg-red-500 hover:text-white cursor-pointer"
                    onClick={() => openModal(p)}
                  >
                    <BsArrowsFullscreen size={16} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => handleShare(p, e)} // Directly call handleShare
                      className="p-1.5 rounded-full shadow hover:scale-110 hover:bg-red-500 hover:text-white transition cursor-pointer bg-white"
                    >
                      <IoShareSocialOutline size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* details */}
              <div
                onClick={() =>
                  navigate(`/fashion/fashion-product-details/${p._id}`)
                }
                className="p-3 flex flex-col gap-2"
              >
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
                <p className="text-sm font-semibold text-gray-500">
                  Stock: <span className="text-red-500 px-1">{p.inStock}</span>
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(p);
                  }}
                  disabled={cartLoadingId === p._id}
                  className="mt-2 w-full bg-white border border-red-500 text-red-500 hover:bg-red-500 hover:text-white py-2 md:py-3 cursor-pointer rounded-md text-[10px] md:text-[13px] font-medium transition flex items-center justify-center gap-5 disabled:cursor-not-allowed"
                >
                  {cartLoadingId === p._id ? (
                    <AuthButtonLoader />
                  ) : (
                    <>
                      <ShoppingCart size={20} /> ADD TO CART
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

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

export default FashionProductCard;

const FashionProductCardSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
    {Array.from({ length: PAGE_SIZE }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl shadow animate-pulse">
        <div className="h-48 bg-gray-300 rounded-t-xl" />
        <div className="p-3 space-y-2">
          <div className="h-3 bg-gray-300 rounded w-3/4" />
          <div className="h-3 bg-gray-300 rounded w-1/2" />
          <div className="h-3 bg-gray-300 rounded w-1/3" />
          <div className="h-8 bg-gray-300 rounded" />
        </div>
      </div>
    ))}
  </div>
);
