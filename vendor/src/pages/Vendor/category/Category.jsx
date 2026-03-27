// File guide: Category source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import { useState } from "react";
import {
  useAddCategoryMutation,
  useAddSubCategoryMutation,
  useAddThirdLevelSubCategoryMutation,
  useGetVendorCategoriesQuery,
} from "../../../features/api/categoryApi";
import { toast } from "react-hot-toast";
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

  const [categoryName, setCategoryName] = useState("");
  const [subCategoryName, setSubCategoryName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSubCategory, setNewSubCategory] = useState("");
  const [newThirdLevel, setNewThirdLevel] = useState("");
  const [categoryPhoto, setCategoryPhoto] = useState(null);
  const pageClass = isDark
    ? "min-h-screen"
    : "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100";
  const headingClass = isDark ? "text-white" : "text-gray-900";
  const cardClass = isDark
    ? "rounded-2xl p-6 shadow-xl border border-slate-700 bg-slate-900/90 hover:shadow-2xl transition-all duration-300 w-full space-y-4 sm:space-y-5"
    : "rounded-2xl p-6 shadow-xl border border-gray-100 bg-white hover:shadow-2xl transition-all duration-300 w-full space-y-4 sm:space-y-5";
  const inputClass = isDark
    ? "w-full p-3 sm:p-4 border border-slate-700 rounded-xl bg-slate-950 text-slate-100 text-sm sm:text-base cursor-pointer"
    : "w-full p-3 sm:p-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-800 text-sm sm:text-base cursor-pointer";
  const fileInputClass = isDark
    ? "w-full p-3 sm:p-4 border border-slate-700 rounded-xl bg-slate-950 text-slate-100 text-sm sm:text-base cursor-pointer"
    : "w-full p-3 sm:p-4 border border-gray-200 rounded-xl bg-white text-gray-800 text-sm sm:text-base cursor-pointer";
  const mutedTextClass = isDark ? "text-slate-400" : "text-gray-500";

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newCategory);
    formData.append("photo", categoryPhoto);
    try {
      await addCategory(formData).unwrap();
      toast.success("Category added successfully!");
      setNewCategory("");
      setCategoryPhoto(null);
      refetch();
    } catch (error) {
      const errMsg =
        error?.data?.message || "Failed to add category. Try a smaller file.";
      toast.error(errMsg);
    }
  };

  const handleAddSubCategory = async (e) => {
    e.preventDefault();
    try {
      await addSubCategory({ categoryName, name: newSubCategory }).unwrap();
      toast.success("Subcategory added successfully!");
      setNewSubCategory("");
      refetch();
    } catch (error) {
      toast.error("Failed to add subcategory");
    }
  };

  const handleAddThirdLevel = async (e) => {
    e.preventDefault();
    try {
      await addThirdLevel({
        categoryName,
        subCategoryName,
        name: newThirdLevel,
      }).unwrap();
      toast.success("Third-level subcategory added successfully!");
      setNewThirdLevel("");
      refetch();
    } catch (error) {
      toast.error("Failed to add third-level subcategory");
    }
  };

  return (
    <div className={pageClass}>
      <h2 className={`text-xl md:text-2xl font-extrabold text-center mb-8 sm:mb-12 tracking-tight ${headingClass}`}>
        Category Management Dashboard
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Add Category */}
          <form
            onSubmit={handleAddCategory}
            className={cardClass}
          >
            <h3 className={`text-sm md:text-xl font-semibold mb-4 sm:mb-6 border-b-2 pb-3 ${isDark ? "text-white border-blue-500/40" : "text-gray-800 border-blue-200"}`}>
              Add New Category
            </h3>
            <input
              type="text"
              placeholder="Enter category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCategoryPhoto(e.target.files[0])}
              required
              className={fileInputClass}
            />
            {categoryPhoto && (
              <p className={`text-xs truncate ${mutedTextClass}`}>
                {categoryPhoto.name}
              </p>
            )}
            <button
              type="submit"
              disabled={isAddingCategory}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all font-semibold flex items-center justify-center shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              {isAddingCategory && (
                <AuthButtonLoader className="w-4 h-4 mr-2" />
              )}
              {isAddingCategory ? "Adding..." : "Add Category"}
            </button>
          </form>

          {/* Add SubCategory */}
          <form
            onSubmit={handleAddSubCategory}
            className={cardClass}
          >
            <h3 className={`text-sm md:text-xl font-semibold mb-4 sm:mb-6 border-b-2 pb-3 ${isDark ? "text-white border-green-500/40" : "text-gray-800 border-green-200"}`}>
              Add Subcategory
            </h3>
            <select
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a category</option>
              {data?.categories?.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Enter subcategory name"
              value={newSubCategory}
              onChange={(e) => setNewSubCategory(e.target.value)}
              required
              disabled={!categoryName}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={isAddingSubCategory}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-3 rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all font-semibold flex items-center justify-center shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              {isAddingSubCategory && (
                <AuthButtonLoader className="w-4 h-4 mr-2" />
              )}
              {isAddingSubCategory ? "Adding..." : "Add Subcategory"}
            </button>
          </form>

          {/* Add Third-Level Subcategory */}
          <form
            onSubmit={handleAddThirdLevel}
            className={cardClass}
          >
            <h3 className={`text-sm md:text-xl font-semibold mb-4 sm:mb-6 border-b-2 pb-3 ${isDark ? "text-white border-purple-500/40" : "text-gray-800 border-purple-200"}`}>
              Add Third-Level Subcategory
            </h3>
            <select
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a category</option>
              {data?.categories?.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              required
              value={subCategoryName}
              onChange={(e) => setSubCategoryName(e.target.value)}
              disabled={!categoryName}
              className={inputClass}
            >
              <option value="">Select a subcategory</option>
              {data?.categories
                ?.find((cat) => cat.name === categoryName)
                ?.subCategories?.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
            </select>
            <input
              type="text"
              placeholder="Enter third-level subcategory name"
              value={newThirdLevel}
              onChange={(e) => setNewThirdLevel(e.target.value)}
              required
              disabled={!subCategoryName}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={isAddingThirdLevel}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-3 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all font-semibold flex items-center justify-center shadow-lg shadow-violet-500/25 cursor-pointer"
            >
              {isAddingThirdLevel && (
                <AuthButtonLoader className="w-4 h-4 mr-2" />
              )}
              {isAddingThirdLevel ? "Adding..." : "Add Third-Level Subcategory"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;

// Skeleton loader
const SkeletonCard = () => (
  <div className="rounded-2xl p-6 shadow-xl border border-gray-100 bg-white w-full animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
    <div className="space-y-4">
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-200 rounded"></div>
      <div className="h-12 bg-gray-300 rounded"></div>
    </div>
  </div>
);
