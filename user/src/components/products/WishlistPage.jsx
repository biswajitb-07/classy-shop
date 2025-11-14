import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, ShoppingCart, Trash2, MoveRight } from "lucide-react";
import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useAddToCartMutation,
} from "../../features/api/cartApi";
import ProductModal from "../../components/products/ProductModal";
import AuthButtonLoader from "../../components/Loader/AuthButtonLoader";
import toast from "react-hot-toast";

const WishlistPage = () => {
  const navigate = useNavigate();
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [modalCartLoading, setModalCartLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState(null);
  const [cartLoadingId, setCartLoadingId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  /* ---- RTK ---- */
  const { data: wishlistData, isLoading } = useGetWishlistQuery();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [addToCart] = useAddToCartMutation();
  const wishlist = wishlistData?.wishlist || [];

  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  /* ---- helpers ---- */
  const updateQuantity = (size, delta) => {
    setQuantities((prev) => {
      const newQ = (prev[size] || 0) + delta;
      if (newQ < 0) return prev;
      return { ...prev, [size]: newQ };
    });
  };
  const openModal = (item) => {
    setSelectedItem(item);
    setQuantities({});
  };
  const closeModal = () => {
    setSelectedItem(null);
    setQuantities({});
  };

  const isVariantRequired = (product, productType) => {
    if (productType === "Fashion") return product.sizes?.length > 0;
    if (productType === "Electronics") return true;
    return false;
  };

  const handleRemove = async (item) => {
    setRemoveLoadingId(item.productId);
    try {
      await removeFromWishlist({
        productId: item.productId,
        productType: item.productType,
      }).unwrap();
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Could not remove");
    } finally {
      setRemoveLoadingId(null);
    }
  };

  const handleMoveToCart = async (item, options) => {
    const product = item.product;
    const productType = item.productType;
    const productId = item.productId;

    if (options) {
      setModalCartLoading(true);
      try {
        if (productType === "Fashion") {
          const selectedSizes = Object.keys(quantities).filter(
            (size) => quantities[size] > 0
          );
          if (product?.sizes?.length > 0 && selectedSizes.length === 0) {
            toast.error("Please select a size and quantity");
            return;
          }
          for (const size of selectedSizes) {
            await addToCart({
              productId,
              productType,
              quantity: quantities[size],
              size,
            }).unwrap();
          }
          if (!product?.sizes?.length) {
            await addToCart({
              productId,
              productType,
              quantity: 1,
              size: null,
            }).unwrap();
          }
        } else if (productType === "Electronics") {
          const { ram, storage } = options;
          await addToCart({
            productId,
            productType,
            quantity: 1,
            ram,
            storage,
          }).unwrap();
        }
        await removeFromWishlist({ productId, productType }).unwrap();
        toast.success("Moved to cart!");
        closeModal();
      } catch {
        toast.error("Failed to move to cart");
      } finally {
        setModalCartLoading(false);
      }
    } else {
      if (isVariantRequired(product, productType)) {
        openModal(item);
      } else {
        setCartLoadingId(product._id);
        try {
          await addToCart({
            productId,
            productType,
            quantity: 1,
            size: null,
          }).unwrap();
          await removeFromWishlist({ productId, productType }).unwrap();
          toast.success("Moved to cart!");
        } catch {
          toast.error("Failed to move to cart");
        } finally {
          setCartLoadingId(null);
        }
      }
    }
  };

  const moveAllToCart = async () => {
    setBulkLoading(true);
    const items = [...wishlist];
    let movedCount = 0;

    for (const i of items) {
      const product = i.product;
      const productType = i.productType;
      const productId = i.productId;
      try {
        let extra = {};
        if (productType === "Fashion") {
          extra.size = product.sizes?.[0] || null;
        } else if (productType === "Electronics") {
          extra.ram = product.rams?.[0];
          extra.storage = product.storage?.[0];
        }
        await addToCart({
          productId,
          productType,
          quantity: 1,
          ...extra,
        }).unwrap();

        await removeFromWishlist({
          productId,
          productType,
        }).unwrap();
        movedCount += 1;
      } catch (err) {
        console.warn("Failed to move", i.productId, err);
      }
    }

    setBulkLoading(false);
    toast.success(
      movedCount === items.length
        ? "All items moved to cart!"
        : `${movedCount}/${items.length} items moved.`
    );
  };

  return (
    <main className="container pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-base md:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Heart className="text-rose-500" size={23} />
          My Wishlist
          {!isLoading && (
            <span className="text-sm md:text-xl font-normal text-slate-500">
              ({wishlist.length} item{wishlist.length !== 1 && "s"})
            </span>
          )}
        </h1>

        {!isLoading && wishlist.length > 0 && (
          <button
            onClick={moveAllToCart}
            disabled={bulkLoading}
            className="mt-4 sm:mt-0 flex items-center justify-center gap-2 bg-rose-500 text-white px-3 text-sm md:text-base md:px-4 py-2 rounded-lg shadow-sm hover:bg-rose-600 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:cursor-not-allowed cursor-pointer"
          >
            {bulkLoading ? (
              <AuthButtonLoader />
            ) : (
              <>
                Move all to cart <MoveRight size={16} />
              </>
            )}
          </button>
        )}
      </div>

      {!isLoading && wishlist.length === 0 && (
        <div className="flex flex-col items-center text-center py-20 bg-white rounded-2xl shadow-sm">
          <img
            src="./empty-cart.png"
            alt="Empty wishlist"
            className="w-48 mb-4"
          />
          <p className="text-slate-600 text-lg mb-6">Your wishlist is empty</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition"
          >
            Continue Shopping
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {wishlist.map((item) => (
            <article
              onClick={() =>
                navigate(
                  `/${item.product.category.toLowerCase()}/${item.product.category.toLowerCase()}-product-details/${
                    item.productId
                  }`
                )
              }
              key={item.productId}
              className="bg-white rounded-2xl shadow-sm overflow-hidden group"
            >
              <div className="relative">
                <img
                  src={item.product.image[0]}
                  alt={item.product.name}
                  className="w-full h-36 md:h-48 object-top object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item);
                  }}
                  disabled={removeLoadingId === item.productId}
                  className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-2 rounded-full text-slate-600 hover:text-rose-600 hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Remove from wishlist"
                >
                  {removeLoadingId === item.productId ? (
                    <AuthButtonLoader />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>

              {/* Details */}
              <div className="p-5">
                <h3 className="font-semibold text-slate-800 truncate text-sm md:text-base lg:text-xl">
                  {item.product.name}
                </h3>
                <p className="text-sm text-slate-500 mb-2">
                  {item.product.brand}
                </p>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-sm md:text-base lg:text-xl font-bold text-rose-600">
                    ₹{item.product.discountedPrice}
                  </span>
                  <span className="text-sm md:text-base lg:text-xl text-slate-400 line-through">
                    ₹{item.product.originalPrice}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToCart(item);
                  }}
                  disabled={cartLoadingId === item.product._id}
                  className="w-full flex items-center justify-center gap-2 md:gap-4 bg-rose-500 text-white py-2 md:py-2.5 rounded-lg hover:bg-rose-600 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:cursor-not-allowed cursor-pointer text-sm md:text-base"
                >
                  {cartLoadingId === item.product._id ? (
                    <AuthButtonLoader />
                  ) : (
                    <>
                      <ShoppingCart size={15} />
                      Move to Cart
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedItem && (
        <ProductModal
          product={selectedItem.product}
          onClose={closeModal}
          onAddToCart={(product, options) =>
            handleMoveToCart(selectedItem, options)
          }
          loading={modalCartLoading}
          updateQuantity={updateQuantity}
          quantities={quantities}
        />
      )}
    </main>
  );
};

export default WishlistPage;

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3 animate-pulse">
    <div className="h-48 bg-slate-200 rounded-lg" />
    <div className="h-5 w-3/4 bg-slate-200 rounded" />
    <div className="h-4 w-1/2 bg-slate-200 rounded" />
    <div className="h-4 w-1/4 bg-slate-200 rounded" />
    <div className="h-10 w-full bg-slate-200 rounded" />
  </div>
);
