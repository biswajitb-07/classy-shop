import { useParams, useNavigate } from "react-router-dom";
import { useGetFashionItemsQuery } from "../../../../features/api/fashionApi";
import { FaStar, FaStarHalfAlt } from "react-icons/fa";
import { IoShareSocialOutline } from "react-icons/io5";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import RelatedProduct from "../../../../components/products/RelatedProduct";
import { useAddToCartMutation } from "../../../../features/api/cartApi";
import { toast } from "react-hot-toast";
import AuthButtonLoader from "../../../../components/Loader/AuthButtonLoader";
import PageLoader from "../../../../components/Loader/PageLoader";
import ErrorMessage from "../../../../components/error/ErrorMessage";
import { useSelector } from "react-redux";

const FashionProductDetails = () => {
  const { data, isLoading } = useGetFashionItemsQuery();
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);

  const [mainImage, setMainImage] = useState("");
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");
  const [quantities, setQuantities] = useState({});
  const [addLoading, setAddLoading] = useState(false);

  const [addToCart] = useAddToCartMutation();

  const product =
    !isLoading &&
    data?.fashionItems?.find((item) => String(item._id) === productId);

  const relatedProducts =
    !isLoading &&
    data?.fashionItems?.filter(
      (item) => item.subCategory === product?.subCategory
    );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

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
    return <div className="flex gap-1 text-sm">{stars}</div>;
  };

  const updateQuantity = (size, delta) => {
    setQuantities((prev) => {
      const newQ = (prev[size] || 0) + delta;
      if (newQ < 0) return prev;
      return { ...prev, [size]: newQ };
    });
  };

  const handleAddToCart = async (product, isMulti = false) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }
    setAddLoading(true);
    if (isMulti) {
      try {
        let hasAdded = false;
        for (const size in quantities) {
          const qty = quantities[size];
          if (qty > 0) {
            hasAdded = true;
            await addToCart({
              productId: product._id,
              productType: "Fashion",
              quantity: qty,
              size,
            }).unwrap();
          }
        }
        if (!hasAdded) {
          toast.error("Please select a size and quantity");
          return;
        }
        toast.success("Products added to cart!");
        setQuantities({});
      } catch (error) {
        toast.error("Failed to add to cart");
        console.error("Failed to add to cart:", error);
      } finally {
        setAddLoading(false);
      }
    } else {
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
        console.error("Failed to add to cart:", error);
      } finally {
        setAddLoading(false);
      }
    }
  };

  const handleShare = async () => {
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

  const pageBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (isLoading) return <PageLoader message="Loading Product details..." />;

  if (!product)
    return (
      <ErrorMessage
        message="Product details not available"
        onRetry={pageBack}
      />
    );

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-10">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-sm sm:text-base text-red-500 hover:underline cursor-pointer"
          >
            ← Back
          </button>

          {/* Share Button */}
          <div className="relative share-container">
            <button
              onClick={handleShare} // Directly call handleShare
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-red-500 border-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <IoShareSocialOutline size={18} />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-5 md:gap-7">
          <div className="flex xl:flex-col gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-2 lg:pb-0">
            {product.image?.map((img, idx) => {
              const isSelected = mainImage ? mainImage === img : idx === 0;
              return (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx}`}
                  onClick={() => setMainImage(img)}
                  className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 object-cover rounded cursor-pointer transition ${
                    isSelected ? "opacity-100" : "opacity-40 hover:opacity-80"
                  }`}
                />
              );
            })}
          </div>

          {/* Main Image */}
          <div
            className="flex justify-center items-center overflow-hidden w-full xl:w-[33rem] rounded-2xl"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTransformOrigin("50% 50%")}
          >
            <img
              src={mainImage || product.image[0]}
              alt={product.name}
              style={{ transformOrigin }}
              className="w-full max-h-[270px] md:max-h-[350px] lg:max-h-[500px] object-cover object-top rounded transition-transform duration-300 ease-in-out hover:scale-[1.5]"
            />
          </div>

          <div className="flex-1 flex flex-col gap-3 sm:gap-4">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold">
              {product.name}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              Brand: {product.brand}
            </p>
            {renderStars(product.rating)}

            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <span className="text-red-600 font-bold text-base sm:text-lg md:text-xl">
                ₹{product.discountedPrice}
              </span>
              <span className="line-through text-gray-400 text-xs sm:text-sm">
                ₹{product.originalPrice}
              </span>
              <div className="text-gray-600 flex gap-1 sm:gap-2 items-center">
                <span className="text-xs sm:text-sm font-semibold">
                  Available Stock:
                </span>
                <span className="text-xs sm:text-sm font-medium text-green-500">
                  {product.inStock}
                </span>
              </div>
            </div>

            <p className="mt-2 text-gray-700 text-xs sm:text-sm tracking-wider">
              {product.description ||
                "This is a beautiful product perfect for your style."}
            </p>

            {/* Size and Quantity Selectors */}
            {product.sizes?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm sm:text-base font-semibold mb-2">
                  Sizes and Quantities:
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-3 place-items-center gap-5">
                  {product.sizes.map((size) => (
                    <div key={size} className="flex items-center gap-2 mb-2">
                      <span className="text-xs sm:text-sm bg-red-500 text-white py-2 px-4">
                        {size}
                      </span>
                      <div className="flex items-center gap-2 border rounded">
                        <button
                          className="px-2 sm:px-3 py-1 hover:bg-gray-200 cursor-pointer"
                          onClick={() => updateQuantity(size, -1)}
                          disabled={(quantities[size] || 0) <= 0}
                        >
                          -
                        </button>
                        <span className="px-2 sm:px-3 min-w-[2rem] text-center text-xs sm:text-sm">
                          {quantities[size] || 0}
                        </span>
                        <button
                          className="px-2 sm:px-3 py-1 hover:bg-gray-200 cursor-pointer"
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

            <p className="mt-2 text-gray-700 text-xs sm:text-sm tracking-wider grid place-items-end">
              {product.shippingInfo}
            </p>

            <div className="grid place-items-end">
              <button
                onClick={() =>
                  handleAddToCart(product, product.sizes?.length > 0)
                }
                disabled={addLoading}
                className="mt-4 px-8 bg-red-500 text-white py-2 sm:py-3 rounded-md text-xs sm:text-sm font-medium hover:bg-red-600 transition flex items-center justify-center gap-2 sm:gap-3 disabled:cursor-not-allowed cursor-pointer"
              >
                {addLoading ? (
                  <AuthButtonLoader />
                ) : (
                  <>
                    <ShoppingCart size={16} className="sm:h-5 sm:w-5" /> ADD TO
                    CART
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <hr className="text-red-500 h-1 my-6" />
      <RelatedProduct products={relatedProducts} isLoading={isLoading} />
    </>
  );
};

export default FashionProductDetails;
