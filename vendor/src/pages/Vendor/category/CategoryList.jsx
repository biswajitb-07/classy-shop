import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  ChevronDown,
  ChevronUp,
  FolderTree,
  ImagePlus,
  Layers3,
  ListTree,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  useDeleteCategoryMutation,
  useDeleteSubCategoryMutation,
  useDeleteThirdLevelSubCategoryMutation,
  useGetVendorCategoriesQuery,
  useUpdateCategoryMutation,
  useUpdateSubCategoryMutation,
  useUpdateThirdLevelSubCategoryMutation,
} from "../../../features/api/categoryApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import ConfirmDialog from "./ConfirmDialog";
import { useTheme } from "../../../context/ThemeContext";

const ITEMS_PER_PAGE = 5;

const CategoryList = () => {
  const { data, isLoading } = useGetVendorCategoriesQuery();
  const { isDark } = useTheme();

  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    oldName: "",
    newName: "",
    photo: null,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [editingThirdLevel, setEditingThirdLevel] = useState(null);
  const [thirdLevelName, setThirdLevelName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    itemName: "",
    itemType: "",
    onConfirm: () => {},
  });

  const [updateCategory, { isLoading: isUpdatingCategory }] =
    useUpdateCategoryMutation();
  const [updateSubCategory, { isLoading: isUpdatingSubCategory }] =
    useUpdateSubCategoryMutation();
  const [updateThirdLevelSubCategory, { isLoading: isUpdatingThirdLevel }] =
    useUpdateThirdLevelSubCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] =
    useDeleteCategoryMutation();
  const [deleteSubCategory, { isLoading: isDeletingSubCategory }] =
    useDeleteSubCategoryMutation();
  const [deleteThirdLevelSubCategory, { isLoading: isDeletingThirdLevel }] =
    useDeleteThirdLevelSubCategoryMutation();

  const categories = data?.categories || [];

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return categories.slice(start, start + ITEMS_PER_PAGE);
  }, [categories, currentPage]);

  const totalPages = Math.max(1, Math.ceil(categories.length / ITEMS_PER_PAGE));

  const summary = useMemo(() => {
    const totalSubCategories = categories.reduce(
      (total, category) => total + (category.subCategories?.length || 0),
      0
    );

    const totalThirdLevels = categories.reduce(
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
      totalSubCategories,
      totalThirdLevels,
    };
  }, [categories]);

  const shellClass = isDark
    ? "min-h-screen space-y-6 px-1 pb-6 text-slate-100"
    : "min-h-screen space-y-6 px-1 pb-6 bg-[radial-gradient(circle_at_top,#fff8ef_0%,#f8fafc_45%,#eef2ff_100%)] text-slate-900";
  const surfaceClass = isDark
    ? "border border-slate-700/80 bg-slate-950/85 shadow-[0_18px_50px_rgba(2,6,23,0.5)]"
    : "border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur";
  const subduedText = isDark ? "text-slate-400" : "text-slate-600";
  const inputClass = isDark
    ? "w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
    : "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20";

  const handleCategoryUpdate = async () => {
    const form = new FormData();
    form.append("oldName", categoryForm.oldName);
    form.append("newName", categoryForm.newName.trim());
    if (categoryForm.photo) {
      form.append("photo", categoryForm.photo);
    }

    try {
      await updateCategory(form).unwrap();
      toast.success("Category updated successfully");
      setEditingCategory(null);
      setPreviewImage(null);
      setCategoryForm({ oldName: "", newName: "", photo: null });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update category");
    }
  };

  const handleSubCategoryUpdate = async () => {
    if (!editingSubCategory) return;

    try {
      await updateSubCategory({
        categoryName: editingSubCategory.categoryName,
        oldSubcategoryName: editingSubCategory.oldName,
        newSubcategoryName: subCategoryName.trim(),
      }).unwrap();
      toast.success("Subcategory updated successfully");
      setEditingSubCategory(null);
      setSubCategoryName("");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update subcategory");
    }
  };

  const handleThirdLevelUpdate = async () => {
    if (!editingThirdLevel) return;

    try {
      await updateThirdLevelSubCategory({
        categoryName: editingThirdLevel.categoryName,
        subCategoryName: editingThirdLevel.subCategoryName,
        oldThirdLevelName: editingThirdLevel.oldName,
        newThirdLevelName: thirdLevelName.trim(),
      }).unwrap();
      toast.success("Third-level category updated successfully");
      setEditingThirdLevel(null);
      setThirdLevelName("");
    } catch (error) {
      toast.error(
        error?.data?.message || "Failed to update third-level category"
      );
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    try {
      await deleteCategory({ categoryName }).unwrap();
      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete category");
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteSubCategory = async (categoryName, subCategoryName) => {
    try {
      await deleteSubCategory({ categoryName, subCategoryName }).unwrap();
      toast.success("Subcategory deleted successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete subcategory");
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteThirdLevel = async (
    categoryName,
    subCategoryName,
    thirdLevelNameToDelete
  ) => {
    try {
      await deleteThirdLevelSubCategory({
        categoryName,
        subCategoryName,
        thirdLevelName: thirdLevelNameToDelete,
      }).unwrap();
      toast.success("Third-level category deleted successfully");
    } catch (error) {
      toast.error(
        error?.data?.message || "Failed to delete third-level category"
      );
    } finally {
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const openConfirmDialog = (itemName, itemType, onConfirm) => {
    setConfirmDialog({
      isOpen: true,
      itemName,
      itemType,
      onConfirm,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className={shellClass}>
      <section
        className={`relative overflow-hidden rounded-[32px] px-5 py-6 sm:px-8 sm:py-8 ${surfaceClass}`}
      >
        <div className="absolute left-0 top-0 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-32 w-32 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative grid gap-6 xl:grid-cols-[1.25fr_0.95fr] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              <FolderTree size={14} />
              Category Archive
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Review and refine your full category hierarchy in one responsive
                view
              </h1>
              <p className={`max-w-2xl text-sm leading-7 sm:text-base ${subduedText}`}>
                Expand categories, clean up sublevels, rename labels, and update
                visuals without jumping across cluttered cards.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            <SummaryCard
              label="Categories"
              value={summary.totalCategories}
              icon={FolderTree}
              isDark={isDark}
            />
            <SummaryCard
              label="Subcategories"
              value={summary.totalSubCategories}
              icon={Layers3}
              isDark={isDark}
            />
            <SummaryCard
              label="Third Level"
              value={summary.totalThirdLevels}
              icon={ListTree}
              isDark={isDark}
            />
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDialog.onConfirm}
        itemName={confirmDialog.itemName}
        itemType={confirmDialog.itemType}
        isLoading={
          confirmDialog.itemType === "category"
            ? isDeletingCategory
            : confirmDialog.itemType === "subcategory"
              ? isDeletingSubCategory
              : isDeletingThirdLevel
        }
      />

      {isLoading ? (
        <CategoryListSkeleton isDark={isDark} />
      ) : (
        <>
          <div className="space-y-5">
            {paginatedCategories.map((category) => {
              const subCategoryCount = category.subCategories?.length || 0;
              const thirdLevelCount = (category.subCategories || []).reduce(
                (total, subCategory) =>
                  total + (subCategory.thirdLevelSubCategories?.length || 0),
                0
              );

              return (
                <article
                  key={category.name}
                  className={`overflow-hidden rounded-[30px] ${surfaceClass}`}
                >
                  <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategory((current) =>
                          current === category.name ? null : category.name
                        )
                      }
                      className="contents text-left"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={category.image}
                          alt={category.name}
                          className={`h-20 w-20 rounded-3xl object-cover shadow-lg ${
                            isDark ? "border border-slate-700" : "border border-sky-100"
                          }`}
                        />
                        <div className="space-y-3">
                          <div>
                            <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                              {category.name}
                            </h2>
                            <p className={`text-sm ${subduedText}`}>
                              {subCategoryCount} subcategories and {thirdLevelCount} third-level
                              groups connected to this category.
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <InfoPill
                              label={`${subCategoryCount} subcategories`}
                              isDark={isDark}
                            />
                            <InfoPill
                              label={`${thirdLevelCount} third-level items`}
                              isDark={isDark}
                            />
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <IconButton
                        icon={Pencil}
                        label="Edit category"
                        tone="blue"
                        onClick={() => {
                          setEditingCategory(category.name);
                          setCategoryForm({
                            oldName: category.name,
                            newName: category.name,
                            photo: null,
                          });
                          setPreviewImage(null);
                        }}
                      />
                      <IconButton
                        icon={Trash2}
                        label="Delete category"
                        tone="red"
                        onClick={() =>
                          openConfirmDialog(category.name, "category", () =>
                            handleDeleteCategory(category.name)
                          )
                        }
                      />
                      <IconButton
                        icon={
                          expandedCategory === category.name ? ChevronUp : ChevronDown
                        }
                        label="Toggle category"
                        tone="neutral"
                        onClick={() =>
                          setExpandedCategory((current) =>
                            current === category.name ? null : category.name
                          )
                        }
                      />
                    </div>
                  </div>

                  {editingCategory === category.name ? (
                    <div
                      className={`border-t px-5 pb-5 pt-5 sm:px-6 ${
                        isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/80"
                      }`}
                    >
                      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
                        <div className="space-y-4">
                          <label className="block space-y-2">
                            <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${subduedText}`}>
                              Category Name
                            </span>
                            <input
                              type="text"
                              value={categoryForm.newName}
                              onChange={(event) =>
                                setCategoryForm((current) => ({
                                  ...current,
                                  newName: event.target.value,
                                }))
                              }
                              className={inputClass}
                            />
                          </label>

                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-4 transition ${
                              isDark
                                ? "border-slate-700 bg-slate-900 hover:border-sky-400/50"
                                : "border-slate-300 bg-white hover:border-sky-400"
                            }`}
                          >
                            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-500">
                              <ImagePlus size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold">
                                {categoryForm.photo?.name || "Choose new image"}
                              </p>
                              <p className={`text-xs ${subduedText}`}>
                                Upload only if you want to replace the current image
                              </p>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0] || null;
                                setCategoryForm((current) => ({
                                  ...current,
                                  photo: file,
                                }));

                                if (!file) {
                                  setPreviewImage(null);
                                  return;
                                }

                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPreviewImage(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        </div>

                        <div className="space-y-3 xl:w-56">
                          <img
                            src={previewImage || category.image}
                            alt={category.name}
                            className={`h-40 w-full rounded-3xl object-cover ${
                              isDark ? "border border-slate-700" : "border border-slate-200"
                            }`}
                          />
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={handleCategoryUpdate}
                              disabled={isUpdatingCategory}
                              className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-70"
                            >
                              {isUpdatingCategory ? (
                                <AuthButtonLoader color="#ffffff" size={16} />
                              ) : (
                                <Save size={16} />
                              )}
                              {isUpdatingCategory ? "Saving..." : "Save Changes"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategory(null);
                                setPreviewImage(null);
                                setCategoryForm({
                                  oldName: "",
                                  newName: "",
                                  photo: null,
                                });
                              }}
                              className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                isDark
                                  ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                              }`}
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {expandedCategory === category.name ? (
                    <div
                      className={`border-t px-5 pb-5 pt-5 sm:px-6 ${
                        isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/80"
                      }`}
                    >
                      {category.subCategories?.length ? (
                        <div className="space-y-4">
                          {category.subCategories.map((subCategory) => {
                            const subKey = `${category.name}::${subCategory.name}`;
                            const thirdLevels =
                              subCategory.thirdLevelSubCategories || [];

                            return (
                              <div
                                key={subKey}
                                className={`rounded-[24px] border p-4 ${
                                  isDark
                                    ? "border-slate-800 bg-slate-900/70"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                      {editingSubCategory?.categoryName ===
                                        category.name &&
                                      editingSubCategory?.oldName ===
                                        subCategory.name ? (
                                        <input
                                          type="text"
                                          value={subCategoryName}
                                          onChange={(event) =>
                                            setSubCategoryName(event.target.value)
                                          }
                                          className={inputClass}
                                        />
                                      ) : (
                                        <h3 className="text-lg font-bold">
                                          {subCategory.name}
                                        </h3>
                                      )}
                                      <InfoPill
                                        label={`${thirdLevels.length} third-level items`}
                                        isDark={isDark}
                                      />
                                    </div>

                                    {thirdLevels.length ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedSubCategory((current) =>
                                            current === subKey ? null : subKey
                                          )
                                        }
                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                                          isDark
                                            ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                      >
                                        {expandedSubCategory === subKey ? (
                                          <ChevronUp size={14} />
                                        ) : (
                                          <ChevronDown size={14} />
                                        )}
                                        {expandedSubCategory === subKey
                                          ? "Hide third-level"
                                          : "Show third-level"}
                                      </button>
                                    ) : (
                                      <p className={`text-sm ${subduedText}`}>
                                        No third-level categories attached yet.
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <IconButton
                                      icon={Pencil}
                                      label="Edit subcategory"
                                      tone="blue"
                                      onClick={() => {
                                        setEditingSubCategory({
                                          categoryName: category.name,
                                          oldName: subCategory.name,
                                        });
                                        setSubCategoryName(subCategory.name);
                                      }}
                                    />
                                    <IconButton
                                      icon={Trash2}
                                      label="Delete subcategory"
                                      tone="red"
                                      onClick={() =>
                                        openConfirmDialog(
                                          subCategory.name,
                                          "subcategory",
                                          () =>
                                            handleDeleteSubCategory(
                                              category.name,
                                              subCategory.name
                                            )
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                {editingSubCategory?.categoryName === category.name &&
                                editingSubCategory?.oldName === subCategory.name ? (
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={handleSubCategoryUpdate}
                                      disabled={isUpdatingSubCategory}
                                      className="flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-70"
                                    >
                                      {isUpdatingSubCategory ? (
                                        <AuthButtonLoader color="#ffffff" size={16} />
                                      ) : (
                                        <Save size={16} />
                                      )}
                                      {isUpdatingSubCategory ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSubCategory(null);
                                        setSubCategoryName("");
                                      }}
                                      className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                                        isDark
                                          ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                                          : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                                      }`}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : null}

                                {expandedSubCategory === subKey && thirdLevels.length ? (
                                  <div className="mt-4 flex flex-wrap gap-3">
                                    {thirdLevels.map((thirdLevel) => {
                                      const isEditingCurrentThird =
                                        editingThirdLevel?.categoryName ===
                                          category.name &&
                                        editingThirdLevel?.subCategoryName ===
                                          subCategory.name &&
                                        editingThirdLevel?.oldName ===
                                          thirdLevel.name;

                                      return (
                                        <div
                                          key={`${subKey}::${thirdLevel.name}`}
                                          className={`flex min-w-[220px] flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                                            isDark
                                              ? "border-slate-800 bg-slate-950"
                                              : "border-slate-200 bg-slate-50"
                                          }`}
                                        >
                                          <div className="min-w-0 flex-1">
                                            {isEditingCurrentThird ? (
                                              <input
                                                type="text"
                                                value={thirdLevelName}
                                                onChange={(event) =>
                                                  setThirdLevelName(event.target.value)
                                                }
                                                className={inputClass}
                                              />
                                            ) : (
                                              <p className="truncate text-sm font-semibold">
                                                {thirdLevel.name}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            {isEditingCurrentThird ? (
                                              <>
                                                <IconButton
                                                  icon={Save}
                                                  label="Save third level"
                                                  tone="green"
                                                  onClick={handleThirdLevelUpdate}
                                                  isLoading={isUpdatingThirdLevel}
                                                />
                                                <IconButton
                                                  icon={X}
                                                  label="Cancel third level edit"
                                                  tone="neutral"
                                                  onClick={() => {
                                                    setEditingThirdLevel(null);
                                                    setThirdLevelName("");
                                                  }}
                                                />
                                              </>
                                            ) : (
                                              <>
                                                <IconButton
                                                  icon={Pencil}
                                                  label="Edit third level"
                                                  tone="blue"
                                                  onClick={() => {
                                                    setEditingThirdLevel({
                                                      categoryName: category.name,
                                                      subCategoryName:
                                                        subCategory.name,
                                                      oldName: thirdLevel.name,
                                                    });
                                                    setThirdLevelName(
                                                      thirdLevel.name
                                                    );
                                                  }}
                                                />
                                                <IconButton
                                                  icon={Trash2}
                                                  label="Delete third level"
                                                  tone="red"
                                                  onClick={() =>
                                                    openConfirmDialog(
                                                      thirdLevel.name,
                                                      "third-level category",
                                                      () =>
                                                        handleDeleteThirdLevel(
                                                          category.name,
                                                          subCategory.name,
                                                          thirdLevel.name
                                                        )
                                                    )
                                                  }
                                                />
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div
                          className={`rounded-[24px] border border-dashed px-5 py-10 text-center ${subduedText} ${
                            isDark ? "border-slate-700 bg-slate-900/50" : "border-slate-300 bg-white"
                          }`}
                        >
                          No subcategories available for this category yet.
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex flex-col items-center justify-between gap-4 rounded-[26px] px-4 py-4 sm:flex-row">
              <p className={`text-sm ${subduedText}`}>
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((current) => Math.max(1, current - 1));
                    setExpandedCategory(null);
                    setExpandedSubCategory(null);
                  }}
                  disabled={currentPage === 1}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    currentPage === 1
                      ? isDark
                        ? "cursor-not-allowed bg-slate-800 text-slate-500"
                        : "cursor-not-allowed bg-slate-200 text-slate-400"
                      : isDark
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                        : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => {
                        setCurrentPage(page);
                        setExpandedCategory(null);
                        setExpandedSubCategory(null);
                      }}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        page === currentPage
                          ? "bg-sky-600 text-white"
                          : isDark
                            ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                            : "bg-white text-slate-900 hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((current) => Math.min(totalPages, current + 1));
                    setExpandedCategory(null);
                    setExpandedSubCategory(null);
                  }}
                  disabled={currentPage === totalPages}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    currentPage === totalPages
                      ? isDark
                        ? "cursor-not-allowed bg-slate-800 text-slate-500"
                        : "cursor-not-allowed bg-slate-200 text-slate-400"
                      : isDark
                        ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
                        : "bg-white text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, isDark }) => (
  <div
    className={`rounded-3xl border px-4 py-5 ${
      isDark
        ? "border-slate-700 bg-slate-900/80"
        : "border-white/70 bg-white/80 shadow-sm"
    }`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </div>
      <div
        className={`rounded-2xl p-3 ${
          isDark ? "bg-slate-800 text-sky-300" : "bg-sky-50 text-sky-600"
        }`}
      >
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const InfoPill = ({ label, isDark }) => (
  <span
    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
      isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"
    }`}
  >
    {label}
  </span>
);

const IconButton = ({ icon: Icon, label, tone, onClick, isLoading = false }) => {
  const toneClass =
    tone === "red"
      ? "bg-rose-500 text-white hover:bg-rose-600"
      : tone === "blue"
        ? "bg-sky-500 text-white hover:bg-sky-600"
        : tone === "green"
          ? "bg-emerald-500 text-white hover:bg-emerald-600"
          : "bg-slate-200 text-slate-800 hover:bg-slate-300";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl transition ${toneClass}`}
    >
      {isLoading ? <AuthButtonLoader color="#ffffff" size={16} /> : <Icon size={18} />}
    </button>
  );
};

const CategoryListSkeleton = ({ isDark }) => (
  <div className="space-y-5">
    {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
      <div
        key={index}
        className={`animate-pulse rounded-[30px] p-6 ${
          isDark
            ? "border border-slate-700 bg-slate-950/85"
            : "border border-white/70 bg-white/90"
        }`}
      >
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="h-20 w-20 rounded-3xl bg-slate-200/20" />
          <div className="space-y-3">
            <div className="h-6 w-48 rounded-2xl bg-slate-200/20" />
            <div className="h-4 w-72 rounded-2xl bg-slate-200/20" />
            <div className="flex gap-2">
              <div className="h-8 w-32 rounded-full bg-slate-200/20" />
              <div className="h-8 w-36 rounded-full bg-slate-200/20" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-11 w-11 rounded-2xl bg-slate-200/20" />
            <div className="h-11 w-11 rounded-2xl bg-slate-200/20" />
            <div className="h-11 w-11 rounded-2xl bg-slate-200/20" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default CategoryList;
