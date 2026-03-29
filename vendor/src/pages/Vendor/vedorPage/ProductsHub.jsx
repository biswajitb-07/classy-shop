import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Cpu,
  Footprints,
  Gem,
  Grid3X3,
  HeartPulse,
  Package2,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import ShowAllFashionProduct from "./fashion/ShowAllFashionProduct";
import ShowAllElectronicProduct from "./electronic/ShowAllElectronicProduct";
import ShowAllBagProduct from "./bag/ShowAllBagProduct";
import ShowAllGroceryProduct from "./grocery/ShowAllGroceryProduct";
import ShowAllFootwearProduct from "./footwear/ShowAllFootwearProduct";
import ShowAllBeautyProduct from "./beauty/ShowAllBeautyProduct";
import ShowAllWellnessProduct from "./wellness/ShowAllWellnessProduct";
import ShowAllJewelleryProduct from "./jewellery/ShowAllJewelleryProduct";

const SECTION_CONFIG = [
  {
    key: "fashion",
    title: "Fashion",
    icon: Shirt,
    description: "Apparel, ethnic wear, and everyday lifestyle products.",
    gradient: "from-fuchsia-500 via-rose-500 to-orange-400",
  },
  {
    key: "electronic",
    title: "Electronics",
    icon: Cpu,
    description: "Phones, devices, accessories, and high-spec gadgets.",
    gradient: "from-cyan-500 via-sky-500 to-indigo-500",
  },
  {
    key: "bag",
    title: "Bags",
    icon: ShoppingBag,
    description: "Backpacks, handbags, travel picks, and utility carry gear.",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
  },
  {
    key: "grocery",
    title: "Grocery",
    icon: ShoppingBasket,
    description: "Daily essentials, pantry staples, and fresh category items.",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
  {
    key: "footwear",
    title: "Footwear",
    icon: Footprints,
    description: "Sneakers, sandals, formal pairs, and performance footwear.",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
  },
  {
    key: "beauty",
    title: "Beauty",
    icon: Sparkles,
    description: "Skincare, cosmetics, grooming, and self-care collections.",
    gradient: "from-pink-500 via-rose-500 to-red-500",
  },
  {
    key: "wellness",
    title: "Wellness",
    icon: HeartPulse,
    description: "Health, nutrition, supplements, and wellness essentials.",
    gradient: "from-lime-500 via-emerald-500 to-teal-500",
  },
  {
    key: "jewellery",
    title: "Jewellery",
    icon: Gem,
    description: "Fine jewellery, fashion accessories, and statement pieces.",
    gradient: "from-yellow-400 via-amber-500 to-orange-500",
  },
];

const LEGACY_ROUTE_TO_SECTION = {
  "/products": "fashion",
  "/fashion-products": "fashion",
  "/electronic-products": "electronic",
  "/bag-products": "bag",
  "/grocery-products": "grocery",
  "/footwear-products": "footwear",
  "/beauty-products": "beauty",
  "/wellness-products": "wellness",
  "/jewellery-products": "jewellery",
};

const SECTION_COMPONENTS = {
  fashion: ShowAllFashionProduct,
  electronic: ShowAllElectronicProduct,
  bag: ShowAllBagProduct,
  grocery: ShowAllGroceryProduct,
  footwear: ShowAllFootwearProduct,
  beauty: ShowAllBeautyProduct,
  wellness: ShowAllWellnessProduct,
  jewellery: ShowAllJewelleryProduct,
};

const SECTION_KEYS = new Set(SECTION_CONFIG.map((section) => section.key));

const resolveSectionFromLocation = (location) => {
  const params = new URLSearchParams(location.search);
  const sectionFromQuery = params.get("section");

  if (sectionFromQuery && SECTION_KEYS.has(sectionFromQuery)) {
    return sectionFromQuery;
  }

  return LEGACY_ROUTE_TO_SECTION[location.pathname] || "fashion";
};

const ProductsHub = () => {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(() =>
    resolveSectionFromLocation(location),
  );

  useEffect(() => {
    setActiveSection(resolveSectionFromLocation(location));
  }, [location]);

  const activeConfig = useMemo(
    () =>
      SECTION_CONFIG.find((section) => section.key === activeSection) ||
      SECTION_CONFIG[0],
    [activeSection],
  );
  const ActiveIcon = activeConfig.icon;
  const ActiveManager =
    SECTION_COMPONENTS[activeSection] || SECTION_COMPONENTS.fashion;

  const shellClass = isDark
    ? "min-h-screen space-y-6 text-slate-100 mb-8"
    : "min-h-screen space-y-6 mb-8 text-slate-900";
  const surfaceClass = isDark
    ? "border border-slate-700/80 bg-slate-950/85 shadow-[0_18px_50px_rgba(2,6,23,0.5)]"
    : "border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur";
  const subduedText = isDark ? "text-slate-400" : "text-slate-600";

  const handleSectionChange = (sectionKey) => {
    navigate(`/products?section=${sectionKey}`);
  };

  return (
    <div className={shellClass}>
      <section
        className={`relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8 ${surfaceClass}`}
      >
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300">
              <WandSparkles size={14} />
              Products Hub
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Manage every product category from one flexible vendor workspace
            </h1>
            <p
              className={`max-w-2xl text-sm leading-7 sm:text-base ${subduedText}`}
            >
              Switch categories without jumping across many product pages. The
              shared hub keeps navigation simple while preserving each
              category&apos;s unique add, edit, image, and filter tools.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <TopStat
              label="Product Sections"
              value={SECTION_CONFIG.length}
              icon={Grid3X3}
              isDark={isDark}
            />
            <TopStat
              label="Current Workspace"
              value={activeConfig.title}
              icon={ActiveIcon}
              isDark={isDark}
            />
            <TopStat
              label="Built For"
              value="Add + Edit"
              icon={Package2}
              isDark={isDark}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)] 2xl:grid-cols-[350px_minmax(0,1fr)]">
        <aside
          className={`rounded-[30px] p-4 sm:p-5 xl:sticky xl:top-6 xl:self-start ${surfaceClass}`}
        >
          <div className="mb-4">
            <h2 className="text-lg font-black">Product Categories</h2>
            <p className={`mt-1 text-sm ${subduedText}`}>
              Pick a category and manage its full product catalog from this
              hub.
            </p>
          </div>

          <div className="grid max-h-[38rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-[46rem] xl:max-h-[calc(100vh-10rem)] xl:grid-cols-1 xl:pr-2 2xl:max-h-[calc(100vh-8rem)] vendor-sidebar-scrollbar">
            {SECTION_CONFIG.map((section) => {
              const Icon = section.icon;
              const isActive = section.key === activeSection;

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => handleSectionChange(section.key)}
                  className={`group rounded-[24px] border p-4 text-left transition ${
                    isActive
                      ? "border-transparent bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]"
                      : isDark
                        ? "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`rounded-2xl bg-gradient-to-br p-3 text-white ${section.gradient}`}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        isActive
                          ? "bg-white/10 text-white"
                          : isDark
                            ? "bg-slate-800 text-slate-200"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      Active
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-bold">{section.title}</h3>
                  <p
                    className={`mt-1 text-sm leading-6 ${
                      isActive ? "text-white/75" : subduedText
                    }`}
                  >
                    {section.description}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6 min-w-0">
          <div className="min-w-0">
            <ActiveManager key={activeSection} />
          </div>
        </section>
      </div>
    </div>
  );
};

const TopStat = ({ label, value, icon: Icon, isDark }) => (
  <div
    className={`rounded-[26px] border p-4 ${
      isDark
        ? "border-slate-800 bg-slate-900/75"
        : "border-slate-200 bg-white/90"
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`rounded-2xl p-3 ${
          isDark ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-900"
        }`}
      >
        <Icon size={18} />
      </div>
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-[0.22em] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <p className="mt-2 text-xl font-black">{value}</p>
      </div>
    </div>
  </div>
);

export default ProductsHub;
