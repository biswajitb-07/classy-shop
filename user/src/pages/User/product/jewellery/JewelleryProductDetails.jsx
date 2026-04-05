import { useParams, useNavigate } from "react-router-dom";
import { FaBalanceScale, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { IoShareSocialOutline } from "react-icons/io5";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import RelatedProduct from "../../../../components/products/RelatedProduct.jsx";
import ProductReviewsSection from "../../../../components/products/ProductReviewsSection.jsx";
import { useAddToCartMutation } from "../../../../features/api/cartApi.js";
import { useGetJewelleryItemsQuery } from "../../../../features/api/jewelleryApi.js";
import AuthButtonLoader from "../../../../components/Loader/AuthButtonLoader.jsx";
import PageLoader from "../../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../../components/error/ErrorMessage.jsx";
import { shareProduct } from "../../../../utils/shareProduct.js";
import useTrackAiProductClick from "../../../../hooks/useTrackAiProductClick.js";
import {
  buildCompareProduct,
  isProductCompared,
  toggleCompareProduct,
} from "../../../../utils/productCompare.js";
import { buildBuyNowItem, persistBuyNowCheckout } from "../../../../utils/buyNow.js";
import { getProductDetailPath, resolveProductIdFromRoute } from "../../../../utils/productCatalog.js";
import {
  getImageFromQuery,
  useProductDetailQueryState,
} from "../../../../hooks/useProductDetailQueryState.js";

const JewelleryProductDetails = () => {
  const { data, isLoading, refetch } = useGetJewelleryItemsQuery();
  const { productId: routeProductId, productSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const { searchParams, updateQueryParams } = useProductDetailQueryState();
  const productId = resolveProductIdFromRoute({
    routeProductId,
    productSlug,
    searchParams,
  });

  const [mainImage, setMainImage] = useState("");
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");
  const [addLoading, setAddLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [compareActive, setCompareActive] = useState(false);

  const [addToCart] = useAddToCartMutation();

  const product =
    !isLoading &&
    data?.jewelleryItems?.find((item) => String(item._id) === productId);

  useTrackAiProductClick(product);

  const relatedProducts =
    !isLoading &&
    data?.jewelleryItems?.filter(
      (item) =>
        String(item._id) !== productId && item.subCategory === product?.subCategory
    );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

  useEffect(() => {
    if (!product?._id) return;
    setCompareActive(isProductCompared(product._id, "Jewellery"));
  }, [product?._id]);

  useEffect(() => {
    if (!product?.image?.length || searchParams.has("image")) return;
    updateQueryParams({ image: 0 });
  }, [product?._id, product?.image, searchParams, updateQueryParams]);

  useEffect(() => {
    if (!product?.image?.length) return;
    setMainImage(getImageFromQuery(searchParams.get("image"), product.image));
  }, [product?.image, searchParams]);

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

  const handleAddToCart = async (redirectToCheckout = false) => {
    if (!isAuthenticated) {
      toast.error("please login");
      return;
    }

    if (redirectToCheckout) {
      const buyNowItems = [buildBuyNowItem({ product, productType: "Jewellery" })];
      persistBuyNowCheckout(buyNowItems);
      toast.success("Redirecting to checkout...");
      navigate("/checkout?mode=buy-now", { state: { buyNowItems } });
      return;
    }

    setAddLoading(true);

    try {
      await addToCart({
        productId: product._id,
        productType: "Jewellery",
        quantity: 1,
      }).unwrap();
      toast.success("Product added to cart!");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add to cart");
    } finally {
      setAddLoading(false);
      setBuyLoading(false);
    }
  };

  const handleShare = async () => {
    const productPath = getProductDetailPath(product, { search: searchParams.toString() });
    const productUrl = `${window.location.origin}${productPath}`

    try {
      const result = await shareProduct({ product, productUrl });
      if (result?.mode === "clipboard") {
        toast.success("Product details copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      toast.error("Failed to share product");
    }
  };

  const handleCompare = () => {
    if (!product) return;

    const productPath = getProductDetailPath(product, { search: searchParams.toString() });

    const result = toggleCompareProduct(
      buildCompareProduct(
        product,
        "Jewellery", productPath)
    );

    if (result.limitReached) {
      toast.error("Compare list me maximum 4 products add kar sakte ho.");
      return;
    }

    setCompareActive(result.compared);
    toast.success(result.compared ? "Added to compare" : "Removed from compare");
  };

  const pageBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (isLoading) return <PageLoader message="Loading Product details..." />;

  if (!product) {
    return (
      <ErrorMessage
        message="Product details not available"
        onRetry={pageBack}
      />
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 sm:px-6 md:px-8 pb-14 md:pb-16">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-md border bg-white text-red-500 border-red-500 hover:bg-red-50 transition-colors cursor-pointer"
            >
              <IoShareSocialOutline size={18} />
              <span className="text-sm">Share</span>
            </button>
            <button
              onClick={handleCompare}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 transition-colors cursor-pointer ${
                compareActive
                  ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <FaBalanceScale size={16} />
              <span className="text-sm">
                {compareActive ? "Compared" : "Compare"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 md:gap-7 xl:flex-row xl:items-start">
          <div className="flex xl:flex-col gap-2 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-2 lg:pb-0">
            {product.image?.map((img, idx) => {
              const isSelected = mainImage ? mainImage === img : idx === 0;
              return (
                <img
                  key={idx}
                  src={img}
                  alt={`${product.name} ${idx}`}
                  onClick={() => {
                    setMainImage(img);
                    updateQueryParams({ image: idx });
                  }}
                  className={`w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28 object-cover rounded cursor-pointer transition ${
                    isSelected ? "opacity-100" : "opacity-40 hover:opacity-80"
                  }`}
                />
              );
            })}
          </div>

          <div
            className="flex w-full self-start justify-center overflow-hidden rounded-2xl xl:w-[33rem] xl:items-start"
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
                  Available Quantity:
                </span>
                <span className="text-xs sm:text-sm font-medium text-green-500">
                  {product.inStock} kg
                </span>
              </div>
            </div>

            <p className="mt-2 text-gray-700 text-xs sm:text-sm tracking-wider">
              {product.description ||
                "This jewellery piece is selected for elegance, occasion styling, and timeless appeal."}
            </p>

            <p className="mt-2 text-gray-700 text-xs sm:text-sm tracking-wider grid place-items-end">
              {product.shippingInfo}
            </p>

            <div className="mt-4 grid w-full gap-3 sm:max-w-md sm:place-items-end sm:self-end">
              <button
                onClick={() => handleAddToCart(false)}
                disabled={addLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-red-500 bg-white px-8 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
              >
                {addLoading ? (
                  <AuthButtonLoader />
                ) : (
                  <>
                    <ShoppingCart size={16} className="sm:h-5 sm:w-5" /> ADD TO CART
                  </>
                )}
              </button>

              <button
                onClick={() => handleAddToCart(true)}
                disabled={buyLoading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500 px-8 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed sm:py-3 sm:text-sm"
              >
                {buyLoading ? <AuthButtonLoader /> : "BUY NOW"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ProductReviewsSection
        productId={product._id}
        productType="Jewellery"
        productName={product.name}
        rating={product.rating}
        reviewsCount={product.reviews}
        onReviewChanged={refetch}
      />
      <hr className="text-red-500 h-1 my-6" />
      <RelatedProduct products={relatedProducts} isLoading={isLoading} />
    </>
  );
};

export default JewelleryProductDetails;

