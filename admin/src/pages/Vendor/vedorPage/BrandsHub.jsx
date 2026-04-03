import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Cpu,
  Footprints,
  Gem,
  HeartPulse,
  Pencil,
  Plus,
  Search,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Tags,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { useGetBrandsQuery, useAddBrandMutation, useDeleteBrandMutation, useUpdateBrandListMutation } from "../../../features/api/fashion/fashionBrandApi";
import { useGetElectronicBrandsQuery, useAddElectronicBrandMutation, useDeleteElectronicBrandMutation, useUpdateElectronicBrandListMutation } from "../../../features/api/electronic/electronicBrandApi";
import { useGetBagBrandsQuery, useAddBagBrandMutation, useDeleteBagBrandMutation, useUpdateBagBrandListMutation } from "../../../features/api/bag/bagBrandApi";
import { useGetGroceryBrandsQuery, useAddGroceryBrandMutation, useDeleteGroceryBrandMutation, useUpdateGroceryBrandListMutation } from "../../../features/api/grocery/groceryBrandApi";
import { useGetFootwearBrandsQuery, useAddFootwearBrandMutation, useDeleteFootwearBrandMutation, useUpdateFootwearBrandListMutation } from "../../../features/api/footwear/footwearBrandApi";
import { useGetBeautyBrandsQuery, useAddBeautyBrandMutation, useDeleteBeautyBrandMutation, useUpdateBeautyBrandListMutation } from "../../../features/api/beauty/beautyBrandApi";
import { useGetWellnessBrandsQuery, useAddWellnessBrandMutation, useDeleteWellnessBrandMutation, useUpdateWellnessBrandListMutation } from "../../../features/api/wellness/welllnessBrandApi";
import { useGetJewelleryBrandsQuery, useAddJewelleryBrandMutation, useDeleteJewelleryBrandMutation, useUpdateJewelleryBrandListMutation } from "../../../features/api/jewellery/jewelleryBrandApi";

const SECTION_CONFIG = [
  { key: "fashion", title: "Fashion", icon: Shirt, description: "Apparel and lifestyle labels.", gradient: "from-fuchsia-500 via-rose-500 to-orange-400" },
  { key: "electronic", title: "Electronics", icon: Cpu, description: "Gadget and device brands.", gradient: "from-cyan-500 via-sky-500 to-indigo-500" },
  { key: "bag", title: "Bags", icon: ShoppingBag, description: "Travel, casual, and premium bag labels.", gradient: "from-amber-500 via-orange-500 to-rose-500" },
  { key: "grocery", title: "Grocery", icon: ShoppingBasket, description: "Daily essentials and packaged goods brands.", gradient: "from-emerald-500 via-teal-500 to-cyan-500" },
  { key: "footwear", title: "Footwear", icon: Footprints, description: "Sneakers, formal, and comfort footwear brands.", gradient: "from-violet-500 via-purple-500 to-fuchsia-500" },
  { key: "beauty", title: "Beauty", icon: Sparkles, description: "Skincare, cosmetics, and grooming labels.", gradient: "from-pink-500 via-rose-500 to-red-500" },
  { key: "wellness", title: "Wellness", icon: HeartPulse, description: "Nutrition and wellness product brands.", gradient: "from-lime-500 via-emerald-500 to-teal-500" },
  { key: "jewellery", title: "Jewellery", icon: Gem, description: "Fine jewellery and fashion accessory labels.", gradient: "from-yellow-400 via-amber-500 to-orange-500" },
];

const ROUTE_TO_SECTION = {
  "/fashion-brand-list": "fashion",
  "/electronic-brand-list": "electronic",
  "/bag-brand-list": "bag",
  "/grocery-brand-list": "grocery",
  "/footwear-brand-list": "footwear",
  "/beauty-brand-list": "beauty",
  "/wellness-brand-list": "wellness",
  "/jewellery-brand-list": "jewellery",
  "/brands": "fashion",
};

const BRANDS_PER_PAGE = 6;

const BrandsHub = () => {
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState(
    ROUTE_TO_SECTION[location.pathname] || "fashion"
  );
  const [newBrandDrafts, setNewBrandDrafts] = useState({});
  const [searchValue, setSearchValue] = useState("");
  const [editingState, setEditingState] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [deletingKey, setDeletingKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fashion = useBrandManager(useGetBrandsQuery, useAddBrandMutation, useDeleteBrandMutation, useUpdateBrandListMutation, "newBrand", "brandToRemove");
  const electronic = useBrandManager(useGetElectronicBrandsQuery, useAddElectronicBrandMutation, useDeleteElectronicBrandMutation, useUpdateElectronicBrandListMutation, "newBrand", "brandToRemove");
  const bag = useBrandManager(useGetBagBrandsQuery, useAddBagBrandMutation, useDeleteBagBrandMutation, useUpdateBagBrandListMutation, "newBrand", "brandToRemove");
  const grocery = useBrandManager(useGetGroceryBrandsQuery, useAddGroceryBrandMutation, useDeleteGroceryBrandMutation, useUpdateGroceryBrandListMutation, "newBrand", "brandToRemove");
  const footwear = useBrandManager(useGetFootwearBrandsQuery, useAddFootwearBrandMutation, useDeleteFootwearBrandMutation, useUpdateFootwearBrandListMutation, "newBrand", "brandToRemove");
  const beauty = useBrandManager(useGetBeautyBrandsQuery, useAddBeautyBrandMutation, useDeleteBeautyBrandMutation, useUpdateBeautyBrandListMutation, "newBrand", "brandToRemove");
  const wellness = useBrandManager(useGetWellnessBrandsQuery, useAddWellnessBrandMutation, useDeleteWellnessBrandMutation, useUpdateWellnessBrandListMutation, "newBrand", "brandToRemove");
  const jewellery = useBrandManager(useGetJewelleryBrandsQuery, useAddJewelleryBrandMutation, useDeleteJewelleryBrandMutation, useUpdateJewelleryBrandListMutation, "newBrand", "brandToRemove");

  const managers = { fashion, electronic, bag, grocery, footwear, beauty, wellness, jewellery };
  const activeConfig = SECTION_CONFIG.find((section) => section.key === activeSection) || SECTION_CONFIG[0];
  const activeManager = managers[activeSection];
  const ActiveIcon = activeConfig.icon;
  const filteredBrands = (activeManager.brands || []).filter((brand) => brand.toLowerCase().includes(searchValue.trim().toLowerCase()));
  const totalBrandPages = Math.max(
    1,
    Math.ceil(filteredBrands.length / BRANDS_PER_PAGE)
  );
  const paginatedBrands = filteredBrands.slice(
    (currentPage - 1) * BRANDS_PER_PAGE,
    currentPage * BRANDS_PER_PAGE
  );
  const totalBrands = SECTION_CONFIG.reduce((total, section) => total + (managers[section.key]?.brands.length || 0), 0);
  const activeCategories = SECTION_CONFIG.filter((section) => (managers[section.key]?.brands.length || 0) > 0).length;

  useEffect(() => {
    const nextSection = ROUTE_TO_SECTION[location.pathname];
    if (nextSection) {
      setActiveSection(nextSection);
    }
  }, [location.pathname]);

  useEffect(() => {
    setCurrentPage(1);
    setEditingState(null);
    setEditValue("");
  }, [activeSection, searchValue]);

  useEffect(() => {
    if (currentPage > totalBrandPages) {
      setCurrentPage(totalBrandPages);
    }
  }, [currentPage, totalBrandPages]);

  const shellClass = isDark
    ? "min-h-screen space-y-6 text-slate-100 mb-8"
    : "min-h-screen space-y-6 mb-8 bg-[radial-gradient(circle_at_top,#fff6fb_0%,#f8fafc_44%,#eef2ff_100%)] text-slate-900";
  const surfaceClass = isDark
    ? "border border-slate-700/80 bg-slate-950/85 shadow-[0_18px_50px_rgba(2,6,23,0.5)]"
    : "border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur";
  const subduedText = isDark ? "text-slate-400" : "text-slate-600";
  const inputClass = isDark
    ? "w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/20"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/20";

  const handleAddBrand = async () => {
    const brandName = (newBrandDrafts[activeSection] || "").trim();
    if (!brandName) return toast.error("Brand name is required.");
    try {
      await activeManager.addBrand(brandName);
      setNewBrandDrafts((current) => ({ ...current, [activeSection]: "" }));
      toast.success(`${activeConfig.title} brand added`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add brand");
    }
  };

  const handleSaveEdit = async (originalBrand) => {
    const nextBrand = editValue.trim();
    if (!nextBrand) return toast.error("Brand name can't be empty.");
    try {
      await activeManager.updateBrandList(
        activeManager.brands.map((brand) => (brand === originalBrand ? nextBrand : brand))
      );
      toast.success("Brand updated successfully");
      setEditingState(null);
      setEditValue("");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update brand");
    }
  };

  const handleDeleteBrand = async (brand) => {
    const key = `${activeSection}:${brand}`;
    setDeletingKey(key);
    try {
      await activeManager.deleteBrand(brand);
      toast.success("Brand deleted successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete brand");
    } finally {
      setDeletingKey("");
    }
  };

  return (
    <div className={shellClass}>
      <section className={`relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8 ${surfaceClass}`}>
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1.2fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300">
              <WandSparkles size={14} />
              Brands Hub
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
              Manage every category brand from one responsive workspace
            </h1>
            <p className={`max-w-2xl text-sm leading-7 sm:text-base ${subduedText}`}>
              No more jumping across many pages. Switch category, add brands, search, edit, and clean your full brand catalog from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <TopStat label="Total Brands" value={totalBrands} icon={Tags} isDark={isDark} />
            <TopStat label="Active Sections" value={activeCategories} icon={Sparkles} isDark={isDark} />
            <TopStat label="Current Section" value={activeManager.brands.length} icon={activeConfig.icon} isDark={isDark} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={`rounded-[30px] p-4 sm:p-5 ${surfaceClass}`}>
          <div className="mb-4">
            <h2 className="text-lg font-black">Brand Categories</h2>
            <p className={`mt-1 text-sm ${subduedText}`}>Switch between categories and manage each brand list from the same page.</p>
          </div>
          <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:max-h-[38rem] xl:max-h-[52rem] xl:grid-cols-1 xl:pr-2 2xl:max-h-[56rem] vendor-sidebar-scrollbar">
            {SECTION_CONFIG.map((section) => {
              const Icon = section.icon;
              const isActive = section.key === activeSection;
              return (
                <button key={section.key} type="button" onClick={() => { setActiveSection(section.key); navigate("/brands"); }} className={`group rounded-[24px] border p-4 text-left transition ${isActive ? "border-transparent bg-slate-950 text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)]" : isDark ? "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className={`rounded-2xl bg-gradient-to-br p-3 text-white ${section.gradient}`}>
                      <Icon size={18} />
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-white/10 text-white" : isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{managers[section.key].brands.length}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold">{section.title}</h3>
                  <p className={`mt-1 text-sm leading-6 ${isActive ? "text-white/75" : subduedText}`}>{section.description}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          <div className={`overflow-hidden rounded-[30px] ${surfaceClass}`}>
            <div className={`bg-gradient-to-r p-5 sm:p-6 text-white ${activeConfig.gradient}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Active Section</p>
                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">{activeConfig.title} Brands</h2>
                  <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">{activeConfig.description}</p>
                </div>
                <div className="rounded-3xl bg-white/12 px-4 py-3 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Live Count</p>
                  <p className="mt-2 text-3xl font-black">{activeManager.brands.length}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
              <label className="relative block">
                <Search className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${subduedText}`} size={18} />
                <input type="text" value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder={`Search ${activeConfig.title.toLowerCase()} brands`} className={`${inputClass} pl-11`} />
              </label>
              <div className="flex gap-3">
                <input type="text" value={newBrandDrafts[activeSection] || ""} onChange={(event) => setNewBrandDrafts((current) => ({ ...current, [activeSection]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddBrand(); } }} placeholder={`Add ${activeConfig.title.toLowerCase()} brand`} className={inputClass} />
                <button type="button" onClick={handleAddBrand} disabled={activeManager.isAdding} className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-70 ${isDark ? "bg-slate-100 text-slate-900 hover:bg-white" : "bg-slate-950 hover:bg-slate-800"}`}>
                  {activeManager.isAdding ? (
                    <AuthButtonLoader
                      size="small"
                      trackClassName={isDark ? "border-slate-400/35" : "border-white/35"}
                      spinnerClassName={isDark ? "border-slate-900" : "border-white"}
                    />
                  ) : (
                    <Plus size={16} />
                  )}
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className={`rounded-[30px] p-5 sm:p-6 ${surfaceClass}`}>
            {activeManager.isLoading ? (
              <div className="space-y-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-[24px] bg-slate-200/20" />)}</div>
            ) : activeManager.isError ? (
              <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-6 text-rose-600">Failed to load brands for {activeConfig.title.toLowerCase()}.</div>
            ) : filteredBrands.length ? (
              <div className="space-y-4">
                {paginatedBrands.map((brand) => {
                  const editKey = `${activeSection}:${brand}`;
                  const isEditing = editingState === editKey;
                  const isDeleting = deletingKey === editKey;
                  return (
                    <div key={editKey} className={`rounded-[24px] border p-4 sm:p-5 ${isDark ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-white"}`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input type="text" value={editValue} onChange={(event) => setEditValue(event.target.value)} className={inputClass} />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleSaveEdit(brand)} disabled={activeManager.isUpdating} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-70">
                              {activeManager.isUpdating ? (
                                <AuthButtonLoader
                                  size="small"
                                  trackClassName="border-white/35"
                                  spinnerClassName="border-white"
                                />
                              ) : null}
                              Save
                            </button>
                            <button type="button" onClick={() => { setEditingState(null); setEditValue(""); }} className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${isDark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`rounded-2xl bg-gradient-to-br p-3 text-white ${activeConfig.gradient}`}>
                              <span className="text-lg font-black">{brand.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-lg font-bold">{brand}</p>
                              <p className={`text-sm ${subduedText}`}>{activeConfig.title} brand</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ActionIcon icon={Pencil} label="Edit brand" tone="blue" onClick={() => { setEditingState(editKey); setEditValue(brand); }} />
                            <ActionIcon icon={Trash2} label="Delete brand" tone="red" onClick={() => handleDeleteBrand(brand)} disabled={isDeleting} isLoading={isDeleting} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-12 text-center">
                <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br text-white ${activeConfig.gradient}`}>
                  <ActiveIcon size={24} />
                </div>
                <h3 className="text-xl font-black">No brands found</h3>
                <p className={`mt-2 text-sm ${subduedText}`}>Add your first {activeConfig.title.toLowerCase()} brand or clear the current search.</p>
              </div>
            )}

            {filteredBrands.length > BRANDS_PER_PAGE ? (
              <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-slate-200/70 pt-5 sm:flex-row">
                <p className={`text-sm ${subduedText}`}>
                  Page {currentPage} of {totalBrandPages}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    disabled={currentPage === 1}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      currentPage === 1
                        ? isDark
                          ? "cursor-not-allowed bg-slate-800 text-slate-500"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                        : isDark
                          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    Previous
                  </button>
                  {Array.from(
                    { length: totalBrandPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        page === currentPage
                          ? "bg-slate-950 text-white"
                          : isDark
                            ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                            : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalBrandPages, page + 1)
                      )
                    }
                    disabled={currentPage === totalBrandPages}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      currentPage === totalBrandPages
                        ? isDark
                          ? "cursor-not-allowed bg-slate-800 text-slate-500"
                          : "cursor-not-allowed bg-slate-200 text-slate-400"
                        : isDark
                          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                          : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

const useBrandManager = (useQueryHook, useAddHook, useDeleteHook, useUpdateHook, addField, deleteField) => {
  const query = useQueryHook();
  const [addMutation, addState] = useAddHook();
  const [deleteMutation] = useDeleteHook();
  const [updateMutation, updateState] = useUpdateHook();

  return useMemo(() => ({
    brands: query.data?.brand || [],
    isLoading: query.isLoading,
    isError: query.isError,
    isAdding: addState.isLoading,
    isUpdating: updateState.isLoading,
    addBrand: (brand) => addMutation({ [addField]: brand }).unwrap(),
    deleteBrand: (brand) => deleteMutation({ [deleteField]: brand }).unwrap(),
    updateBrandList: (brandList) => updateMutation({ brand: brandList }).unwrap(),
  }), [addField, addMutation, addState.isLoading, deleteField, deleteMutation, query.data?.brand, query.isError, query.isLoading, updateMutation, updateState.isLoading]);
};

const TopStat = ({ label, value, icon: Icon, isDark }) => (
  <div className={`rounded-3xl border px-4 py-5 ${isDark ? "border-slate-700 bg-slate-900/80" : "border-white/70 bg-white/80 shadow-sm"}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <div className={`rounded-2xl p-3 ${isDark ? "bg-slate-800 text-fuchsia-300" : "bg-fuchsia-50 text-fuchsia-600"}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const ActionIcon = ({
  icon: Icon,
  label,
  tone,
  onClick,
  disabled = false,
  isLoading = false,
}) => {
  const toneClass = tone === "red" ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-sky-500 text-white hover:bg-sky-600";
  return <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition disabled:opacity-60 ${toneClass}`}>{isLoading ? <AuthButtonLoader size="small" trackClassName="border-white/35" spinnerClassName="border-white" /> : <Icon size={18} />}</button>;
};

export default BrandsHub;
