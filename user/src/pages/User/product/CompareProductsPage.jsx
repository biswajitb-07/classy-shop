import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  PackageSearch,
  Scale,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useTheme } from "../../../context/ThemeContext.jsx";
import {
  clearCompareProducts,
  getCompareProducts,
  removeCompareProduct,
} from "../../../utils/productCompare.js";

const comparisonRows = [
  { label: "Brand", key: "brand" },
  { label: "Category", key: "productType" },
  { label: "Subcategory", key: "subCategory" },
  { label: "Third level", key: "thirdCategory" },
  { label: "Rating", key: "rating" },
  { label: "Reviews", key: "reviews" },
  { label: "Discounted price", key: "discountedPrice" },
  { label: "Original price", key: "originalPrice" },
  { label: "Stock", key: "inStock" },
  { label: "Sizes", key: "sizes" },
  { label: "RAM", key: "ram" },
  { label: "Storage", key: "storage" },
  { label: "Shipping", key: "shippingInfo" },
];

const formatValue = (key, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "discountedPrice" || key === "originalPrice") return `₹${value}`;
  if (key === "rating") return Number(value) ? `${Number(value).toFixed(1)} / 5` : "—";
  return String(value);
};

const CompareProductsPage = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [products, setProducts] = useState(() => getCompareProducts());

  useEffect(() => {
    const syncProducts = () => setProducts(getCompareProducts());

    window.addEventListener("compare-products:updated", syncProducts);
    window.addEventListener("storage", syncProducts);
    return () => {
      window.removeEventListener("compare-products:updated", syncProducts);
      window.removeEventListener("storage", syncProducts);
    };
  }, []);

  const bestRated = useMemo(() => {
    if (!products.length) return null;
    return [...products].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0];
  }, [products]);

  const cheapest = useMemo(() => {
    if (!products.length) return null;
    return [...products].sort(
      (a, b) => Number(a.discountedPrice || 0) - Number(b.discountedPrice || 0),
    )[0];
  }, [products]);

  const handleRemove = (product) => {
    const next = removeCompareProduct(product._id, product.productType);
    setProducts(next);
    toast.success("Product removed from compare");
  };

  const handleClear = () => {
    clearCompareProducts();
    setProducts([]);
    toast.success("Compare list cleared");
  };

  if (!products.length) {
    return (
      <section className="container mx-auto px-4 pb-10 md:px-3">
        <div
          className={`rounded-[34px] border p-8 text-center shadow-[0_18px_70px_rgba(15,23,42,0.08)] md:p-12 ${
            isDark
              ? "border-slate-800 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-950"
          }`}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg">
            <Scale size={34} />
          </div>
          <h1 className="mt-6 text-3xl font-black">No products in compare list</h1>
          <p
            className={`mx-auto mt-3 max-w-xl text-sm leading-7 md:text-base ${
              isDark ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Product detail pages se Compare button use karke shortlisted products
            yahan side-by-side dekh sakte ho.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/fashion")}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Browse products
            </button>
            <button
              type="button"
              onClick={() => navigate("/help-center")}
              className={`rounded-full border px-5 py-3 text-sm font-semibold transition ${
                isDark
                  ? "border-slate-700 text-slate-100 hover:bg-slate-900"
                  : "border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              Compare guide
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 pb-10 md:px-3">
      <div
        className={`overflow-hidden rounded-[34px] border shadow-[0_18px_70px_rgba(15,23,42,0.08)] ${
          isDark
            ? "border-slate-800 bg-slate-950 text-white"
            : "border-slate-200 bg-white text-slate-950"
        }`}
      >
        <div
          className={`px-6 py-10 md:px-10 lg:px-12 ${
            isDark
              ? "bg-[linear-gradient(135deg,#020617_0%,#0f172a_55%,#451a03_100%)]"
              : "bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_48%,#eff6ff_100%)]"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white dark:bg-white dark:text-slate-950">
                <PackageSearch size={14} />
                Compare Products
              </div>
              <h1 className="mt-5 text-4xl font-black md:text-5xl">
                Review your shortlisted products in one view.
              </h1>
              <p
                className={`mt-4 max-w-3xl text-base leading-7 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Price, ratings, stock, specs, aur shipping details ek saath dekhkar
                faster decision le sakte ho.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              <Trash2 size={16} />
              Clear list
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div
              className={`rounded-[26px] border p-5 ${
                isDark
                  ? "border-slate-800 bg-slate-900/80"
                  : "border-white bg-white/80"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Compared now
              </p>
              <p className="mt-3 text-3xl font-black">{products.length}</p>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                Upto 4 products ko ek saath compare kar sakte ho.
              </p>
            </div>
            <div
              className={`rounded-[26px] border p-5 ${
                isDark
                  ? "border-slate-800 bg-slate-900/80"
                  : "border-white bg-white/80"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Best rated
              </p>
              <p className="mt-3 text-xl font-black">
                {bestRated?.name || "—"}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-amber-500">
                <Star size={15} fill="currentColor" />
                {bestRated ? `${Number(bestRated.rating || 0).toFixed(1)} rating` : "—"}
              </p>
            </div>
            <div
              className={`rounded-[26px] border p-5 ${
                isDark
                  ? "border-slate-800 bg-slate-900/80"
                  : "border-white bg-white/80"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Lowest price
              </p>
              <p className="mt-3 text-xl font-black">
                {cheapest?.name || "—"}
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-500">
                <BadgeIndianRupee size={15} />
                {cheapest ? `₹${cheapest.discountedPrice}` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-6 py-8 md:px-10">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[220px_repeat(4,minmax(220px,1fr))] gap-4">
              <div />
              {products.map((product) => (
                <div
                  key={`${product.productType}-${product._id}`}
                  className={`rounded-[26px] border p-4 ${
                    isDark
                      ? "border-slate-800 bg-slate-900"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="overflow-hidden rounded-[22px] bg-white">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-slate-100 text-slate-400">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                    {product.productType}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-lg font-black">
                    {product.name}
                  </h2>
                  <p
                    className={`mt-2 line-clamp-3 text-sm leading-6 ${
                      isDark ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    {product.description}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Link
                      to={product.productUrl || "/"}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                    >
                      View product
                      <ArrowRight size={14} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(product)}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 4 - products.length) }).map((_, index) => (
                <div
                  key={`placeholder-${index}`}
                  className={`rounded-[26px] border border-dashed p-4 ${
                    isDark
                      ? "border-slate-800 bg-slate-900/40 text-slate-400"
                      : "border-slate-300 bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="flex h-full min-h-[19rem] flex-col items-center justify-center text-center">
                    <Scale size={28} />
                    <p className="mt-4 text-sm font-semibold">
                      Add another product
                    </p>
                    <p className="mt-2 text-xs">
                      Product detail page se Compare use karo.
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {comparisonRows.map((row) => (
                <div
                  key={row.key}
                  className={`grid grid-cols-[220px_repeat(4,minmax(220px,1fr))] gap-4 rounded-[22px] border p-3 ${
                    isDark
                      ? "border-slate-800 bg-slate-950"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center px-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                    {row.label}
                  </div>
                  {products.map((product) => (
                    <div
                      key={`${product.productType}-${product._id}-${row.key}`}
                      className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                        isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-700"
                      }`}
                    >
                      {formatValue(row.key, product[row.key])}
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - products.length) }).map((_, index) => (
                    <div
                      key={`${row.key}-placeholder-${index}`}
                      className={`rounded-2xl px-4 py-3 text-sm ${
                        isDark ? "bg-slate-900 text-slate-500" : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      —
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompareProductsPage;
