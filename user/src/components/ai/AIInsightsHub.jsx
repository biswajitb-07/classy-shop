// File guide: AIInsightsHub source file.
// This file belongs to the current app architecture and has a focused responsibility within its module/folder.
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, BrainCircuit, ScanSearch, TrendingUp } from "lucide-react";
import { useGetWishlistQuery } from "../../features/api/cartApi.js";
import { useMarketplaceSearch } from "../search/useMarketplaceSearch.js";
import {
  buildProductPath,
  getDemandPrediction,
  getFraudSignals,
  getPersonalizedRecommendations,
  getProductViewHistory,
  getSalesForecast,
  getSentimentInsights,
  recordProductView,
} from "../../utils/aiShopping.js";

const gradientCards = [
  "from-orange-500 via-rose-500 to-red-500",
  "from-sky-500 via-cyan-500 to-blue-600",
  "from-emerald-500 via-teal-500 to-cyan-600",
];

const inferImageIntent = (fileName = "", catalog = []) => {
  const normalized = fileName.toLowerCase();
  const categoryMap = [
    { terms: ["shoe", "sneaker", "heel", "footwear"], category: "Footwear" },
    { terms: ["phone", "laptop", "camera", "electronic"], category: "Electronics" },
    { terms: ["bag", "backpack", "purse"], category: "Bag" },
    { terms: ["lip", "beauty", "cream", "makeup"], category: "Beauty" },
    { terms: ["rice", "fruit", "grocery", "vegetable"], category: "Grocery" },
    { terms: ["ring", "chain", "jewel"], category: "Jewellery" },
    { terms: ["fashion", "shirt", "dress", "jacket"], category: "Fashion" },
    { terms: ["wellness", "supplement", "yoga"], category: "Wellness" },
  ];

  const detectedCategory =
    categoryMap.find((entry) =>
      entry.terms.some((term) => normalized.includes(term)),
    )?.category || "Fashion";

  return catalog
    .filter((item) => (item.sourceLabel || item.category) === detectedCategory)
    .slice(0, 4);
};

const AIInsightsHub = () => {
  const { catalog, isLoading } = useMarketplaceSearch();
  const { data: wishlistData } = useGetWishlistQuery();
  const wishlist = wishlistData?.wishlist || [];
  const imageInputRef = useRef(null);
  const [imageResults, setImageResults] = useState([]);
  const [imageLabel, setImageLabel] = useState("");

  const viewHistory = useMemo(() => getProductViewHistory(), []);
  const recommendations = useMemo(
    () => getPersonalizedRecommendations(catalog, wishlist),
    [catalog, wishlist],
  );
  const demandPrediction = useMemo(() => getDemandPrediction(catalog), [catalog]);
  const salesForecast = useMemo(() => getSalesForecast(catalog), [catalog]);
  const fraudSignals = useMemo(() => getFraudSignals(catalog), [catalog]);
  const sentimentInsights = useMemo(() => getSentimentInsights(catalog), [catalog]);

  const personalizedHeadline =
    viewHistory[0]?.category || recommendations[0]?.sourceLabel || "smart picks";

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const results = inferImageIntent(file.name, catalog);
    setImageResults(results);
    setImageLabel(file.name);
  };

  return (
    <section className="px-4 py-10 md:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="overflow-hidden rounded-[34px] border border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_38%,#fff1f2_100%)] p-6 shadow-[0_24px_80px_rgba(249,115,22,0.12)] md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white">
                <Sparkles size={14} />
                AI Commerce Layer
              </div>
              <h2 className="mt-5 max-w-3xl font-black leading-tight text-slate-950 text-3xl md:text-5xl">
                Personalized shopping, trust signals, smart search, and market intelligence in one place.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Your homepage is now tuned using browsing history, wishlist intent, product quality, pricing signals, and lightweight AI heuristics.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "AI picks",
                    value: recommendations.length,
                    meta: `${personalizedHeadline} based`,
                  },
                  {
                    label: "Demand radar",
                    value: demandPrediction[0]?.demandScore || 0,
                    meta: demandPrediction[0]?.category || "Category insight",
                  },
                  {
                    label: "Trust monitor",
                    value: fraudSignals[0]?.trustScore || 0,
                    meta: "Fraud-aware scoring",
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={`rounded-[24px] bg-gradient-to-r ${gradientCards[index]} p-[1px]`}
                  >
                    <div className="rounded-[24px] bg-white px-5 py-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-3 text-3xl font-black text-slate-950">
                        {item.value}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_20px_70px_rgba(15,23,42,0.4)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                    Image-based product search
                  </p>
                  <h3 className="mt-2 text-2xl font-black">Visual finder</h3>
                </div>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-950"
                >
                  Upload image
                </button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Upload an image file like `shoe.png` or `beauty-kit.jpg`. The AI finder reads visual intent hints and matches the nearest catalog category.
              </p>

              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-slate-400">
                  Latest visual query
                </p>
                <p className="mt-2 text-lg font-bold text-white">
                  {imageLabel || "No image uploaded yet"}
                </p>
                <div className="mt-4 grid gap-3">
                  {imageResults.length ? (
                    imageResults.map((item) => (
                      <Link
                        key={item._id}
                        to={buildProductPath(item)}
                        onClick={() => recordProductView(item)}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                      >
                        <img
                          src={item.image?.[0] || "/fallback-image.jpg"}
                          alt={item.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            {(item.sourceLabel || item.category)} match
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-slate-400">
                      Upload a file to unlock smart visual product discovery.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-500">
                  AI Product Recommendations
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Personalized for your browsing history
                </h3>
              </div>
              <BrainCircuit className="text-slate-900" size={24} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {(isLoading ? [] : recommendations).map((item) => (
                <Link
                  key={item._id}
                  to={buildProductPath(item)}
                  onClick={() => recordProductView(item)}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image?.[0] || "/fallback-image.jpg"}
                      alt={item.name}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {item.sourceLabel || item.category}
                      </p>
                      <h4 className="mt-2 truncate text-lg font-black text-slate-950">
                        {item.name}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        AI match score {item.aiScore}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-semibold text-red-500">
                          Rs. {item.discountedPrice || item.originalPrice}
                        </span>
                        <span className="text-slate-500">
                          Rating {item.rating || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">
                    Demand prediction for inventory
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">
                    Smart demand radar
                  </h3>
                </div>
                <TrendingUp className="text-slate-900" size={22} />
              </div>
              <div className="mt-6 space-y-4">
                {demandPrediction.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">{item.category}</span>
                      <span className="text-slate-500">
                        {item.label} · {item.demandScore}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500"
                        style={{ width: `${item.demandScore}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">
                    Sales forecasting charts
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">
                    Weekly forecast pulse
                  </h3>
                </div>
                <Sparkles className="text-slate-900" size={22} />
              </div>
              <div className="mt-8 grid grid-cols-7 items-end gap-3">
                {salesForecast.map((item) => (
                  <div key={item.day} className="flex flex-col items-center gap-3">
                    <div className="flex h-44 items-end">
                      <div
                        className="w-8 rounded-t-[18px] bg-gradient-to-t from-fuchsia-500 via-rose-500 to-orange-400 shadow-[0_12px_24px_rgba(244,63,94,0.22)]"
                        style={{ height: `${Math.max(18, item.forecast)}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-500">{item.day}</p>
                      <p className="text-sm font-semibold text-slate-900">{item.forecast}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <div className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_80px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
                  Fraud / spam detection
                </p>
                <h3 className="mt-2 text-2xl font-black">Trust shield</h3>
              </div>
              <ShieldCheck size={22} className="text-white" />
            </div>
            <div className="mt-6 space-y-3">
              {fraudSignals.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[22px] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.name}</p>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-amber-200">
                      Trust {item.trustScore}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    AI flags pricing, rating, stock anomalies, and missing detail patterns to reduce spam-like discovery.
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-500">
                  Sentiment analysis on reviews
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Shopper mood signals
                </h3>
              </div>
              <ScanSearch className="text-slate-900" size={22} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sentimentInsights.map((item) => (
                <div
                  key={item._id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    {item.sentiment}
                  </p>
                  <h4 className="mt-2 text-lg font-black text-slate-950">{item.name}</h4>
                  <p className="mt-3 text-sm text-slate-500">
                    AI sentiment score {item.sentimentScore} based on rating and product quality signals.
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                      style={{ width: `${item.sentimentScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AIInsightsHub;
