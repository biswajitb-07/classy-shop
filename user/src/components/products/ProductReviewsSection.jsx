import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FaChevronLeft, FaChevronRight, FaRegCommentDots, FaStar } from "react-icons/fa";
import { CheckCircle2, LockKeyhole, Star } from "lucide-react";
import { toast } from "react-hot-toast";
import AuthButtonLoader from "../Loader/AuthButtonLoader.jsx";
import {
  useDeleteProductReviewMutation,
  useGetProductReviewMetaQuery,
  useGetProductReviewsQuery,
  useUpsertProductReviewMutation,
} from "../../features/api/reviewApi.js";

const defaultFormState = {
  rating: 5,
  title: "",
  comment: "",
};

const formatReviewDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const renderStaticStars = (rating) => {
  const normalized = Math.round(Number(rating || 0));

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <FaStar
          key={index}
          className={index < normalized ? "text-amber-400" : "text-slate-300"}
        />
      ))}
    </div>
  );
};

const ProductReviewsSection = ({
  productId,
  productType,
  productName,
  rating = 0,
  reviewsCount = 0,
  onReviewChanged,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [form, setForm] = useState(defaultFormState);
  const reviewSliderRef = useRef(null);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const [failedReviewAvatars, setFailedReviewAvatars] = useState({});

  const { data: reviewsData, isLoading: isReviewsLoading } =
    useGetProductReviewsQuery(
      { productId, productType },
      {
        skip: !productId || !productType,
      }
    );

  const { data: metaData, isFetching: isMetaLoading } =
    useGetProductReviewMetaQuery(
      { productId, productType },
      {
        skip: !isAuthenticated || !productId || !productType,
      }
    );

  const [upsertProductReview, { isLoading: isSavingReview }] =
    useUpsertProductReviewMutation();
  const [deleteProductReview, { isLoading: isDeletingReview }] =
    useDeleteProductReviewMutation();

  const userReview = metaData?.userReview || null;
  const reviews = reviewsData?.reviews || [];
  const summary = useMemo(
    () => ({
      averageRating:
        reviewsData?.summary?.averageRating ?? Number(rating || 0),
      totalReviews: reviewsData?.summary?.totalReviews ?? Number(reviewsCount || 0),
    }),
    [rating, reviewsCount, reviewsData?.summary?.averageRating, reviewsData?.summary?.totalReviews]
  );

  const ratingDistribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((value) => {
        const count = reviews.filter(
          (review) => Math.round(Number(review.rating || 0)) === value
        ).length;

        return {
          value,
          count,
          width:
            summary.totalReviews > 0
              ? `${Math.max(8, (count / summary.totalReviews) * 100)}%`
              : "0%",
        };
      }),
    [reviews, summary.totalReviews]
  );

  useEffect(() => {
    if (userReview) {
      setForm({
        rating: Number(userReview.rating || 5),
        title: userReview.title || "",
        comment: userReview.comment || "",
      });
      return;
    }

    setForm(defaultFormState);
  }, [userReview]);

  useEffect(() => {
    setActiveReviewIndex(0);
  }, [reviews.length, productId, productType]);

  const handleStarSelect = (value) => {
    setForm((prev) => ({ ...prev, rating: value }));
  };

  const getReviewInitial = (name) =>
    String(name || "U").trim().charAt(0).toUpperCase() || "U";

  const handleAvatarError = (reviewId) => {
    setFailedReviewAvatars((prev) => ({
      ...prev,
      [reviewId]: true,
    }));
  };

  const scrollToReview = (index) => {
    if (!reviewSliderRef.current) return;

    const boundedIndex = Math.max(0, Math.min(index, reviews.length - 1));
    const container = reviewSliderRef.current;
    const nextCard = container.children[boundedIndex];

    if (!nextCard) return;

    nextCard.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
    setActiveReviewIndex(boundedIndex);
  };

  const handleReviewScroll = () => {
    if (!reviewSliderRef.current) return;

    const container = reviewSliderRef.current;
    const cardWidth = container.clientWidth;

    if (!cardWidth) return;

    const nextIndex = Math.round(container.scrollLeft / cardWidth);
    if (nextIndex !== activeReviewIndex) {
      setActiveReviewIndex(Math.max(0, Math.min(nextIndex, reviews.length - 1)));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!form.comment.trim()) {
      toast.error("Please write your review");
      return;
    }

    try {
      await upsertProductReview({
        productId,
        productType,
        rating: form.rating,
        title: form.title.trim(),
        comment: form.comment.trim(),
      }).unwrap();

      toast.success(userReview ? "Review updated" : "Review submitted");
      onReviewChanged?.();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to save review");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProductReview({ productId, productType }).unwrap();
      toast.success("Review deleted");
      onReviewChanged?.();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete review");
    }
  };

  return (
    <section className="container mx-auto px-4 pb-12 sm:px-6 md:px-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)] shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(253,224,71,0.18),transparent_28%),linear-gradient(180deg,#ffffff_0%,#fffaf0_100%)] px-5 py-6 sm:px-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Ratings & Reviews
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                Real customer feedback
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {productName
                  ? `${productName} ke delivered orders se aayi verified reviews.`
                  : "Delivered orders se aayi verified reviews."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[28rem]">
              <div className="rounded-[1.75rem] border border-amber-200 bg-white/80 px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Overall Rating
                    </p>
                    <div className="mt-2 flex items-end gap-3">
                      <span className="text-4xl font-black text-slate-900">
                        {Number(summary.averageRating || 0).toFixed(1)}
                      </span>
                      <span className="pb-1 text-sm font-medium text-slate-500">
                        / 5
                      </span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-500">
                    <Star size={22} />
                  </div>
                </div>
                <div className="mt-3">{renderStaticStars(summary.averageRating)}</div>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200 bg-white/80 px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Written Reviews
                    </p>
                    <p className="mt-2 text-4xl font-black text-slate-900">
                      {summary.totalReviews}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <FaRegCommentDots className="text-lg" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Verified buyer opinions aur real product experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 px-5 py-6 xl:grid-cols-[0.92fr_1.08fr] xl:px-7">
          <div className="space-y-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/90 p-5">
              <h3 className="text-lg font-semibold text-slate-900">
                Rating snapshot
              </h3>
              <div className="mt-5 space-y-3">
                {ratingDistribution.map((item) => (
                  <div key={item.value} className="flex items-center gap-3">
                    <div className="flex w-14 items-center gap-1 text-sm font-medium text-slate-700">
                      <span>{item.value}</span>
                      <FaStar className="text-amber-400" />
                    </div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                        style={{ width: item.count ? item.width : "0%" }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-slate-500">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {userReview ? "Update your review" : "Write a review"}
              </h3>
              {metaData?.hasDeliveredPurchase ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Verified purchase
                </span>
              ) : null}
            </div>

            {!isAuthenticated ? (
              <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600">
                Review likhne ke liye login karo.
              </div>
            ) : isMetaLoading ? (
              <div className="mt-4 flex min-h-[12rem] items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white">
                <AuthButtonLoader className="border-slate-300 border-t-slate-700" />
              </div>
            ) : metaData?.canReview || userReview ? (
              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <p className="text-sm font-medium text-slate-700">Your rating</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleStarSelect(value)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
                          form.rating >= value
                            ? "border-amber-300 bg-amber-50 text-amber-500"
                            : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400"
                        }`}
                      >
                        <FaStar />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Review title
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Short headline"
                    maxLength={120}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 caret-red-500 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Your review
                  </label>
                  <textarea
                    value={form.comment}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, comment: event.target.value }))
                    }
                    placeholder="Product quality, packaging, delivery experience..."
                    rows={5}
                    maxLength={1200}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 caret-red-500 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {userReview ? (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeletingReview || isSavingReview}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-rose-200 bg-white px-5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeletingReview ? (
                        <AuthButtonLoader
                          className="border-rose-200 border-t-rose-600"
                        />
                      ) : (
                        "Delete Review"
                      )}
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSavingReview || isDeletingReview || isMetaLoading}
                    className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingReview ? (
                      <AuthButtonLoader />
                    ) : userReview ? (
                      "Update Review"
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                    <LockKeyhole size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Review unlock after delivered order
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Customer reviews</h3>
              {reviews.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToReview(activeReviewIndex - 1)}
                    disabled={activeReviewIndex === 0}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaChevronLeft />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToReview(activeReviewIndex + 1)}
                    disabled={activeReviewIndex >= reviews.length - 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-red-200 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaChevronRight />
                  </button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              {isReviewsLoading ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  Reviews load ho rahe hain...
                </div>
              ) : reviews.length ? (
                <>
                  <div
                    ref={reviewSliderRef}
                    onScroll={handleReviewScroll}
                    className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 scrollbar-hide"
                  >
                    {reviews.map((review) => (
                      <article
                        key={review._id}
                        className="min-w-full snap-start rounded-[1.9rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {review.user?.photoUrl &&
                            !failedReviewAvatars[review._id] ? (
                              <img
                                src={review.user.photoUrl}
                                alt={review.user.name}
                                className="h-14 w-14 rounded-full object-cover ring-4 ring-slate-50"
                                onError={() => handleAvatarError(review._id)}
                              />
                            ) : (
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-base font-bold text-white shadow-sm ring-4 ring-slate-50">
                                {getReviewInitial(review.user?.name)}
                              </div>
                            )}
                            <div>
                              <p className="text-2xl font-bold leading-tight text-slate-900">
                                {review.user?.name || "Customer"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {formatReviewDate(review.updatedAt || review.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            {renderStaticStars(review.rating)}
                            {review.isVerifiedPurchase ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 size={12} />
                                Verified purchase
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {review.title ? (
                          <h4 className="mt-6 text-2xl font-bold text-slate-900">
                            {review.title}
                          </h4>
                        ) : null}

                        <p className="mt-5 text-lg leading-8 text-slate-700">
                          {review.comment}
                        </p>
                      </article>
                    ))}
                  </div>

                  {reviews.length > 1 ? (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {reviews.map((review, index) => (
                        <button
                          key={review._id}
                          type="button"
                          onClick={() => scrollToReview(index)}
                          aria-label={`Go to review ${index + 1}`}
                          className={`h-2.5 rounded-full transition-all ${
                            activeReviewIndex === index
                              ? "w-8 bg-red-500"
                              : "w-2.5 bg-slate-300 hover:bg-slate-400"
                          }`}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  No reviews yet. Be the first one to review this product!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductReviewsSection;
