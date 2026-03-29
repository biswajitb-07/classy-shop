import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  FolderPlus,
  FolderTree,
  ImagePlus,
  Layers3,
  ListTree,
  Sparkles,
} from "lucide-react";
import {
  useAddCategoryMutation,
  useAddSubCategoryMutation,
  useAddThirdLevelSubCategoryMutation,
  useGetVendorCategoriesQuery,
} from "../../../features/api/categoryApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { useTheme } from "../../../context/ThemeContext";

const CategoryManager = () => {
  const { data, refetch, isLoading } = useGetVendorCategoriesQuery();
  const { isDark } = useTheme();

  const [addCategory, { isLoading: isAddingCategory }] =
    useAddCategoryMutation();
  const [addSubCategory, { isLoading: isAddingSubCategory }] =
    useAddSubCategoryMutation();
  const [addThirdLevel, { isLoading: isAddingThirdLevel }] =
    useAddThirdLevelSubCategoryMutation();

  const [newCategory, setNewCategory] = useState("");
  const [categoryPhoto, setCategoryPhoto] = useState(null);
  const [subCategoryParent, setSubCategoryParent] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [thirdParentCategory, setThirdParentCategory] = useState("");
  const [thirdParentSubCategory, setThirdParentSubCategory] = useState("");
  const [newThirdLevel, setNewThirdLevel] = useState("");

  const categories = data?.categories || [];

  const summary = useMemo(() => {
    const subCategoryCount = categories.reduce(
      (total, category) => total + (category.subCategories?.length || 0),
      0
    );

    const thirdLevelCount = categories.reduce(
      (total, category) =>
        total +
        (category.subCategories || []).reduce(
          (subTotal, subCategory) =>
            subTotal + (subCategory.thirdLevelSubCategories?.length || 0),
          0
        ),
      0
    );

    return {
      totalCategories: categories.length,
      totalSubCategories: subCategoryCount,
      totalThirdLevels: thirdLevelCount,
    };
  }, [categories]);

  const thirdLevelParentOptions =
    categories.find((category) => category.name === thirdParentCategory)
      ?.subCategories || [];

  const shellClass = isDark
    ? "min-h-screen space-y-6 text-slate-100"
    : "min-h-screen space-y-6 bg-[radial-gradient(circle_at_top,#fff8ef_0%,#f8fafc_45%,#eef2ff_100%)] text-slate-900";
  const surfaceClass = isDark
    ? "border border-slate-700/80 bg-slate-950/80 text-slate-100 shadow-[0_20px_60px_rgba(2,6,23,0.45)]"
    : "border border-white/70 bg-white/90 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-600";
  const inputClass = isDark
    ? "w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/20"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-500/20";

  const handleAddCategory = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("name", newCategory.trim());
    if (categoryPhoto) {
      formData.append("photo", categoryPhoto);
    }

    try {
      await addCategory(formData).unwrap();
      toast.success("Category added successfully");
      setNewCategory("");
      setCategoryPhoto(null);
      refetch();
    } catch (error) {
      toast.error(
        error?.data?.message || "Failed to add category. Please try again."
      );
    }
  };

  const handleAddSubCategory = async (event) => {
    event.preventDefault();

    try {
      await addSubCategory({
        categoryName: subCategoryParent,
        name: newSubCategory.trim(),
      }).unwrap();
      toast.success("Subcategory added successfully");
      setNewSubCategory("");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add subcategory");
    }
  };

  const handleAddThirdLevel = async (event) => {
    event.preventDefault();

    try {
      await addThirdLevel({
        categoryName: thirdParentCategory,
        subCategoryName: thirdParentSubCategory,
        name: newThirdLevel.trim(),
      }).unwrap();
      toast.success("Third-level subcategory added successfully");
      setNewThirdLevel("");
      refetch();
    } catch (error) {
      toast.error(
        error?.data?.message || "Failed to add third-level subcategory"
      );
    }
  };

  return (
    <div className={shellClass}>
      <section
        className={`relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8 ${surfaceClass}`}
      >
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.9fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-300">
              <Sparkles size={14} />
              Catalog Studio
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Build category, subcategory, and third-level structure in one
                cleaner workspace
              </h1>
              <p className={`max-w-2xl text-sm leading-7 sm:text-base ${mutedClass}`}>
                Organize your storefront taxonomy with a stronger visual layout,
                cleaner hierarchy, and mobile-friendly controls that stay easy
                to use even when the catalog grows.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <StatCard
              label="Categories"
              value={summary.totalCategories}
              icon={FolderTree}
              isDark={isDark}
            />
            <StatCard
              label="Subcategories"
              value={summary.totalSubCategories}
              icon={Layers3}
              isDark={isDark}
            />
            <StatCard
              label="Third Level"
              value={summary.totalThirdLevels}
              icon={ListTree}
              isDark={isDark}
            />
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <SkeletonCard isDark={isDark} />
          <SkeletonCard isDark={isDark} />
          <SkeletonCard isDark={isDark} />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-3">
          <article
            className={`rounded-[28px] p-5 sm:p-6 ${surfaceClass} overflow-hidden`}
          >
            <FormTop
              icon={FolderPlus}
              step="Step 1"
              title="Create a category"
              description="Add a category name and image to start the catalog tree."
              accentClass="from-sky-500 via-cyan-400 to-indigo-500"
              isDark={isDark}
            />

            <form onSubmit={handleAddCategory} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Category Name
                </span>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  required
                  className={inputClass}
                />
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 transition ${
                  isDark
                    ? "border-slate-700 bg-slate-900 hover:border-sky-400/50"
                    : "border-slate-300 bg-slate-50 hover:border-sky-400"
                }`}
              >
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-500">
                  <ImagePlus size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {categoryPhoto ? categoryPhoto.name : "Upload category image"}
                  </p>
                  <p className={`text-xs ${mutedClass}`}>
                    JPG, PNG, or WEBP under 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setCategoryPhoto(event.target.files?.[0] || null)
                  }
                  required
                  className="hidden"
                />
              </label>

              <ActionButton
                label={isAddingCategory ? "Adding Category..." : "Add Category"}
                isLoading={isAddingCategory}
                gradientClass="from-sky-500 via-blue-500 to-indigo-600"
              />
            </form>
          </article>

          <article
            className={`rounded-[28px] p-5 sm:p-6 ${surfaceClass} overflow-hidden`}
          >
            <FormTop
              icon={Layers3}
              step="Step 2"
              title="Add a subcategory"
              description="Attach deeper product groups to an existing parent category."
              accentClass="from-emerald-500 via-teal-400 to-cyan-500"
              isDark={isDark}
            />

            <form onSubmit={handleAddSubCategory} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Parent Category
                </span>
                <select
                  required
                  value={subCategoryParent}
                  onChange={(event) => setSubCategoryParent(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Subcategory Name
                </span>
                <input
                  type="text"
                  placeholder="Enter subcategory name"
                  value={newSubCategory}
                  onChange={(event) => setNewSubCategory(event.target.value)}
                  required
                  disabled={!subCategoryParent}
                  className={inputClass}
                />
              </label>

              <ActionButton
                label={
                  isAddingSubCategory
                    ? "Adding Subcategory..."
                    : "Add Subcategory"
                }
                isLoading={isAddingSubCategory}
                gradientClass="from-emerald-500 via-teal-500 to-green-600"
              />
            </form>
          </article>

          <article
            className={`rounded-[28px] p-5 sm:p-6 ${surfaceClass} overflow-hidden`}
          >
            <FormTop
              icon={ListTree}
              step="Step 3"
              title="Create third-level taxonomy"
              description="Use a final layer for precise catalog navigation and filtering."
              accentClass="from-fuchsia-500 via-violet-500 to-purple-600"
              isDark={isDark}
            />

            <form onSubmit={handleAddThirdLevel} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Category
                </span>
                <select
                  required
                  value={thirdParentCategory}
                  onChange={(event) => {
                    setThirdParentCategory(event.target.value);
                    setThirdParentSubCategory("");
                  }}
                  className={inputClass}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Subcategory
                </span>
                <select
                  required
                  value={thirdParentSubCategory}
                  onChange={(event) =>
                    setThirdParentSubCategory(event.target.value)
                  }
                  disabled={!thirdParentCategory}
                  className={inputClass}
                >
                  <option value="">Select a subcategory</option>
                  {thirdLevelParentOptions.map((subCategory) => (
                    <option key={subCategory.name} value={subCategory.name}>
                      {subCategory.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}>
                  Third-Level Name
                </span>
                <input
                  type="text"
                  placeholder="Enter third-level subcategory name"
                  value={newThirdLevel}
                  onChange={(event) => setNewThirdLevel(event.target.value)}
                  required
                  disabled={!thirdParentSubCategory}
                  className={inputClass}
                />
              </label>

              <ActionButton
                label={
                  isAddingThirdLevel
                    ? "Adding Third-Level..."
                    : "Add Third-Level Subcategory"
                }
                isLoading={isAddingThirdLevel}
                gradientClass="from-fuchsia-500 via-violet-500 to-purple-600"
              />
            </form>
          </article>
        </div>
      )}
    </div>
  );
};

const FormTop = ({
  icon: Icon,
  step,
  title,
  description,
  accentClass,
  isDark,
}) => (
  <div
    className={`relative overflow-hidden rounded-[26px] border p-5 ${
      isDark
        ? "border-white/10 bg-slate-950/40"
        : "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
    }`}
  >
    <div
      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentClass}`}
    />
    <div className="flex items-start gap-4">
      <div
        className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${accentClass}`}
      >
        <Icon size={18} />
      </div>
      <div className="space-y-2">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.28em] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {step}
        </p>
        <h2 className="text-xl font-bold">{title}</h2>
        <p
          className={`text-sm leading-6 ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, isDark }) => (
  <div
    className={`rounded-3xl border px-4 py-5 ${
      isDark
        ? "border-slate-700 bg-slate-900/80"
        : "border-white/70 bg-white/75 shadow-sm"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <div
        className={`rounded-2xl p-3 ${
          isDark ? "bg-slate-800 text-fuchsia-300" : "bg-fuchsia-50 text-fuchsia-600"
        }`}
      >
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const ActionButton = ({ label, isLoading, gradientClass }) => (
  <button
    type="submit"
    disabled={isLoading}
    className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 ${gradientClass}`}
  >
    {isLoading ? (
      <AuthButtonLoader
        size="small"
        trackClassName="border-white/35"
        spinnerClassName="border-white"
      />
    ) : null}
    {label}
  </button>
);

const SkeletonCard = ({ isDark }) => (
  <div
    className={`animate-pulse rounded-[28px] p-6 ${
      isDark ? "border border-slate-700 bg-slate-950/80" : "border border-white/70 bg-white/90"
    }`}
  >
    <div className="h-24 rounded-3xl bg-slate-200/20" />
    <div className="mt-5 space-y-4">
      <div className="h-12 rounded-2xl bg-slate-200/20" />
      <div className="h-12 rounded-2xl bg-slate-200/20" />
      <div className="h-12 rounded-2xl bg-slate-200/20" />
    </div>
  </div>
);

export default CategoryManager;
