import { useState } from "react";
import {
  useGetVendorCategoriesQuery,
  useUpdateCategoryMutation,
  useUpdateSubCategoryMutation,
  useDeleteCategoryMutation,
  useDeleteSubCategoryMutation,
  useDeleteThirdLevelSubCategoryMutation,
  useUpdateThirdLevelSubCategoryMutation,
} from "../../../features/api/categoryApi";
import {
  AiOutlineEdit,
  AiOutlineDown,
  AiOutlineUp,
  AiOutlineDelete,
} from "react-icons/ai";
import { toast } from "react-hot-toast";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import ConfirmDialog from "./ConfirmDialog";

const CategoryList = () => {
  const { data, isLoading } = useGetVendorCategoriesQuery();
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [expandedSubIndex, setExpandedSubIndex] = useState(null);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    oldName: "",
    newName: "",
    photo: null,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [subEditIndex, setSubEditIndex] = useState({
    category: null,
    sub: null,
  });
  const [subEditName, setSubEditName] = useState("");
  const [thirdEditIndex, setThirdEditIndex] = useState({
    category: null,
    sub: null,
    third: null,
  });
  const [thirdEditName, setThirdEditName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    itemName: "",
    itemType: "",
    onConfirm: () => {},
  });
  const itemsPerPage = 5;

  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateCategoryMutation();
  const [updateSubCategory, { isLoading: isUpdatingSub }] =
    useUpdateSubCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] =
    useDeleteCategoryMutation();
  const [deleteSubCategory, { isLoading: isDeletingSubCategory }] =
    useDeleteSubCategoryMutation();
  const [deleteThirdLevelSubCategory, { isLoading: isDeletingThirdLevel }] =
    useDeleteThirdLevelSubCategoryMutation();
  const [updateThirdLevelSubCategory, { isLoading: isUpdatingThird }] =
    useUpdateThirdLevelSubCategoryMutation();

  const handleToggleAccordion = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleToggleSubAccordion = (subIndex) => {
    setExpandedSubIndex(expandedSubIndex === subIndex ? null : subIndex);
  };

  const handleEditClick = (index, name) => {
    setEditIndex(index);
    setFormData({ oldName: name, newName: name, photo: null });
    setPreviewImage(null);
  };

  const handleCategoryUpdate = async (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("oldName", formData.oldName);
    form.append("newName", formData.newName);
    if (formData.photo) form.append("photo", formData.photo);

    try {
      await updateCategory(form).unwrap();
      toast.success("Category updated successfully!");
      setEditIndex(null);
      setPreviewImage(null);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update category");
    }
  };

  const handleSubcategoryUpdate = async ({
    categoryName,
    oldSubcategoryName,
    newSubcategoryName,
  }) => {
    try {
      await updateSubCategory({
        categoryName,
        oldSubcategoryName,
        newSubcategoryName,
      }).unwrap();
      toast.success("Subcategory updated!");
      setSubEditIndex({
        category: null,
        sub: null,
      });
    } catch (err) {
      console.error("Update Subcategory Error:", err);
      toast.error("Failed to update subcategory");
    }
  };

  const handleThirdLevelUpdate = async ({
    categoryName,
    subCategoryName,
    oldThirdLevelName,
    newThirdLevelName,
  }) => {
    try {
      await updateThirdLevelSubCategory({
        categoryName,
        subCategoryName,
        oldThirdLevelName,
        newThirdLevelName,
      }).unwrap();
      toast.success("Third-level category updated!");
      setThirdEditIndex({
        category: null,
        sub: null,
        third: null,
      });
    } catch (err) {
      console.error("Update Third-level Category Error:", err);
      toast.error("Failed to update third-level category");
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    try {
      await deleteCategory({ categoryName }).unwrap();
      toast.success("Category deleted successfully!");
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete category");
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  };

  const handleDeleteSubCategory = async (categoryName, subCategoryName) => {
    try {
      await deleteSubCategory({ categoryName, subCategoryName }).unwrap();
      toast.success("Subcategory deleted successfully!");
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete subcategory");
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    }
  };

  const handleDeleteThirdLevelSubCategory = async (
    categoryName,
    subCategoryName,
    thirdLevelName
  ) => {
    try {
      await deleteThirdLevelSubCategory({
        categoryName,
        subCategoryName,
        thirdLevelName,
      }).unwrap();
      toast.success("Third-level category deleted successfully!");
      setConfirmDialog({ ...confirmDialog, isOpen: false });
    } catch (error) {
      toast.error(
        error?.data?.message || "Failed to delete third-level category"
      );
      setConfirmDialog({ ...confirmDialog, isOpen: false });
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
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  // Pagination logic
  const totalItems = data?.categories?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = data?.categories?.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedIndex(null);
    setEditIndex(null);
  };

  return (
    <div className="px-2 pb-5 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <h1 className="text-xl font-extrabold mb-8 text-gray-900 tracking-tight">
        Category List
      </h1>

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
        <CategoryListSkeleton count={itemsPerPage} />
      ) : (
        <>
          <div className="space-y-6">
            {currentCategories?.map((cat, index) => (
              <div
                key={index}
                className="border rounded-3xl p-6 shadow-2xl bg-white hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Header Row */}
                <div
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
                  onClick={() => handleToggleAccordion(index)}
                >
                  <div className="flex items-center gap-5 mb-4 sm:mb-0">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 shadow-md"
                    />
                    <h2 className="text-base font-bold text-gray-900">
                      {cat.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <AiOutlineEdit
                      className="text-blue-500 hover:text-blue-700 text-2xl cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(index, cat.name);
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfirmDialog(cat.name, "category", () =>
                          handleDeleteCategory(cat.name)
                        );
                      }}
                      disabled={isDeletingCategory}
                      className="text-red-500 hover:text-red-700 text-2xl cursor-pointer transition-colors flex items-center"
                    >
                      <AiOutlineDelete />
                    </button>
                    {expandedIndex === index ? (
                      <AiOutlineUp className="text-gray-700 text-xl" />
                    ) : (
                      <AiOutlineDown className="text-gray-700 text-xl" />
                    )}
                  </div>
                </div>

                {/* Accordion Content */}
                {expandedIndex === index && (
                  <div className="mt-6 ml-0 sm:ml-6">
                    {cat.subCategories?.length > 0 ? (
                      <ul className="space-y-4">
                        {cat.subCategories.map((sub, subIndex) => (
                          <li key={subIndex} className="text-gray-800">
                            <div
                              className="flex justify-between items-center cursor-pointer py-2 px-4 bg-gray-300 rounded-xl hover:bg-gray-400 transition"
                              onClick={() => handleToggleSubAccordion(subIndex)}
                            >
                              <span className="text-[0.9rem] font-medium">
                                {subEditIndex.category === index &&
                                subEditIndex.sub === subIndex ? (
                                  <input
                                    type="text"
                                    value={subEditName}
                                    onChange={(e) =>
                                      setSubEditName(e.target.value)
                                    }
                                    className="px-2 py-1 rounded border border-gray-300 text-sm cursor-pointer"
                                  />
                                ) : (
                                  sub.name
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                <AiOutlineEdit
                                  className="text-blue-500 hover:text-blue-700 text-lg cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSubEditIndex({
                                      category: index,
                                      sub: subIndex,
                                    });
                                    setSubEditName(sub.name);
                                  }}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openConfirmDialog(
                                      sub.name,
                                      "subcategory",
                                      () =>
                                        handleDeleteSubCategory(
                                          cat.name,
                                          sub.name
                                        )
                                    );
                                  }}
                                  disabled={isDeletingSubCategory}
                                  className="text-red-500 hover:text-red-700 text-lg cursor-pointer transition-colors flex items-center"
                                >
                                  <AiOutlineDelete />
                                </button>
                                {sub.thirdLevelSubCategories?.length > 0 && (
                                  <>
                                    {expandedSubIndex === subIndex ? (
                                      <AiOutlineUp className="text-gray-600" />
                                    ) : (
                                      <AiOutlineDown className="text-gray-600" />
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Save/Cancel for subcategory edit */}
                            {subEditIndex.category === index &&
                              subEditIndex.sub === subIndex && (
                                <div className="ml-4 mt-2 flex gap-2">
                                  <button
                                    onClick={() =>
                                      handleSubcategoryUpdate({
                                        categoryName: cat.name,
                                        oldSubcategoryName: sub.name,
                                        newSubcategoryName: subEditName,
                                      })
                                    }
                                    disabled={isUpdatingSub}
                                    className="text-white bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400 cursor-pointer flex items-center gap-2"
                                  >
                                    {isUpdatingSub && (
                                      <AuthButtonLoader
                                        color="#ffffff"
                                        size={16}
                                      />
                                    )}
                                    {isUpdatingSub ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setSubEditIndex({
                                        category: null,
                                        sub: null,
                                      })
                                    }
                                    className="text-white bg-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}

                            {/* Third Level */}
                            {expandedSubIndex === subIndex &&
                              sub.thirdLevelSubCategories?.length > 0 && (
                                <ul className="ml-8 mt-2 space-y-2 text-sm text-gray-700">
                                  {sub.thirdLevelSubCategories.map(
                                    (third, thirdIndex) => (
                                      <li
                                        key={thirdIndex}
                                        className="pl-4 border-l-2 border-blue-200 flex justify-between items-center"
                                      >
                                        <span>
                                          {thirdEditIndex.category === index &&
                                          thirdEditIndex.sub === subIndex &&
                                          thirdEditIndex.third ===
                                            thirdIndex ? (
                                            <input
                                              type="text"
                                              value={thirdEditName}
                                              onChange={(e) =>
                                                setThirdEditName(e.target.value)
                                              }
                                              className="px-2 py-1 rounded border border-gray-300 text-sm"
                                            />
                                          ) : (
                                            third.name
                                          )}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <AiOutlineEdit
                                            className="text-blue-500 hover:text-blue-700 text-lg cursor-pointer"
                                            onClick={() => {
                                              setThirdEditIndex({
                                                category: index,
                                                sub: subIndex,
                                                third: thirdIndex,
                                              });
                                              setThirdEditName(third.name);
                                            }}
                                          />
                                          <button
                                            onClick={() => {
                                              openConfirmDialog(
                                                third.name,
                                                "third-level category",
                                                () =>
                                                  handleDeleteThirdLevelSubCategory(
                                                    cat.name,
                                                    sub.name,
                                                    third.name
                                                  )
                                              );
                                            }}
                                            disabled={isDeletingThirdLevel}
                                            className="text-red-500 hover:text-red-700 text-lg cursor-pointer transition-colors flex items-center"
                                          >
                                            <AiOutlineDelete />
                                          </button>
                                        </div>
                                      </li>
                                    )
                                  )}
                                  {/* Save/Cancel for third-level edit */}
                                  {thirdEditIndex.category === index &&
                                    thirdEditIndex.sub === subIndex && (
                                      <div className="ml-4 mt-2 flex gap-2">
                                        <button
                                          onClick={() =>
                                            handleThirdLevelUpdate({
                                              categoryName: cat.name,
                                              subCategoryName: sub.name,
                                              oldThirdLevelName:
                                                sub.thirdLevelSubCategories[
                                                  thirdEditIndex.third
                                                ].name,
                                              newThirdLevelName: thirdEditName,
                                            })
                                          }
                                          disabled={isUpdatingThird}
                                          className="text-white bg-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400 cursor-pointer flex items-center gap-2"
                                        >
                                          {isUpdatingThird && (
                                            <AuthButtonLoader
                                              color="#ffffff"
                                              size={16}
                                            />
                                          )}
                                          {isUpdatingThird
                                            ? "Saving..."
                                            : "Save"}
                                        </button>
                                        <button
                                          onClick={() =>
                                            setThirdEditIndex({
                                              category: null,
                                              sub: null,
                                              third: null,
                                            })
                                          }
                                          className="text-white bg-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-600"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}
                                </ul>
                              )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 italic text-center">
                        No subcategories available.
                      </p>
                    )}
                  </div>
                )}

                {/* Edit Form */}
                {editIndex === index && (
                  <div className="mt-6 bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-inner">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                      Edit Category
                    </h3>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={formData.newName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newName: e.target.value,
                          })
                        }
                        className="border border-gray-300 px-4 py-3 w-full rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition bg-white shadow-sm"
                        required
                      />
                    </div>
                    <div className="mb-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Photo (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          setFormData({ ...formData, photo: file });
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPreviewImage(reader.result);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setPreviewImage(null);
                          }
                        }}
                        className="w-full text-gray-600 file:mr-4 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition"
                      />
                      {previewImage && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600 mb-2">
                            Image Preview:
                          </p>
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="w-40 h-40 object-cover rounded-xl border-2 border-gray-200 shadow-md"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={handleCategoryUpdate}
                        disabled={isUpdating}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 transition disabled:bg-blue-400 shadow-md cursor-pointer"
                      >
                        {isUpdating && (
                          <AuthButtonLoader color="#ffffff" size={20} />
                        )}
                        {isUpdating ? "Updating..." : "Update Category"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditIndex(null);
                          setPreviewImage(null);
                        }}
                        className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition shadow-md cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-3">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 hover:bg-blue-700 transition shadow-md cursor-pointer"
              >
                Previous
              </button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-xl shadow-md transition cursor-pointer ${
                        currentPage === page
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 hover:bg-blue-700 transition shadow-md cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryList;

const CategoryListSkeleton = ({ count = 5 }) => {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="border rounded-3xl p-6 shadow-2xl animate-pulse duration-75 ease-in-out"
        >
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-center gap-5 mb-4 sm:mb-0">
              <div className="w-20 h-20 rounded-full bg-gray-300" />
              <div className="h-6 w-32 bg-gray-300 rounded-md" />
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-6 bg-gray-300 rounded-md" />
              <div className="w-6 h-6 bg-gray-300 rounded-full" />
            </div>
          </div>

          {/* Subcategory skeleton */}
          <div className="mt-6 ml-0 sm:ml-6 space-y-3">
            <div className="h-4 bg-gray-300 rounded-lg w-2/3" />
            <div className="h-4 bg-gray-300 rounded-lg w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};
