import { useState, useEffect } from "react";
import {
  useGetFashionItemsQuery,
  useDeleteFashionItemMutation,
  useUpdateFashionItemMutation,
  useUpdateFashionImagesByIndexMutation,
} from "../../../../features/api/fashion/fashionApi";
import {
  FaTrash,
  FaSync,
  FaEdit,
  FaPlus,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaTag,
  FaBoxOpen,
  FaInfoCircle,
  FaShapes,
  FaStar,
  FaStarHalfAlt,
  FaList,
  FaFilter,
  FaSearch,
} from "react-icons/fa";
import { GiClothes } from "react-icons/gi";
import { HiSparkles, HiTrendingUp, HiCollection } from "react-icons/hi";
import { BiTrendingUp } from "react-icons/bi";
import { MdDashboard } from "react-icons/md";
import toast from "react-hot-toast";
import AuthButtonLoader from "../../../../component/Loader/AuthButtonLoader";
import AddFashionItem from "./AddFashionItem";
import { useGetVendorCategoriesQuery } from "../../../../features/api/categoryApi";
import { useGetBrandsQuery } from "../../../../features/api/fashion/fashionBrandApi";

const SIZES = ["S", "M", "L", "XL", "XXL"];
const CATEGORY = "Fashion";
const ITEMS_PER_PAGE = 15;

const ShowAllFashionProduct = () => {
  const { data: response, isLoading, refetch } = useGetFashionItemsQuery();
  const [deleteFashionItem, { isLoading: isDeleting }] =
    useDeleteFashionItemMutation();
  const [updateFashionItem, { isLoading: isUpdating }] =
    useUpdateFashionItemMutation();
  const [updateFashionImagesByIndex, { isLoading: isUpdatingImages }] =
    useUpdateFashionImagesByIndexMutation();
  const { data: categoryData, refetch: categoryRefetch } =
    useGetVendorCategoriesQuery();
  const { data: fashionBrands, refetch: brandRefetch } = useGetBrandsQuery();

  const [selectedUpdates, setSelectedUpdates] = useState({});
  const [newImages, setNewImages] = useState({});
  const [editItem, setEditItem] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [currentSlide, setCurrentSlide] = useState({});
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [selectedThirdLevel, setSelectedThirdLevel] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const items = response?.fashionItems ?? [];
  const brands = [...new Set(items.map((item) => item.brand))];
  const matchedCategory = categoryData?.categories?.find(
    (cat) => cat.name === CATEGORY
  );
  const subCategories =
    matchedCategory?.subCategories?.map((sub) => sub.name) ?? [];
  const thirdLevelCategories =
    matchedCategory?.subCategories
      ?.flatMap((sub) =>
        sub.thirdLevelSubCategories?.map((third) => third.name)
      )
      ?.filter((name, index, self) => self.indexOf(name) === index) ?? [];

  const filteredItems = items.filter((item) => {
    const matchesTab =
      activeTab === "all" ||
      item.brand.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSubCategory =
      selectedSubCategory === "all" ||
      item.subCategory.toLowerCase() === selectedSubCategory.toLowerCase();
    const matchesThirdLevel =
      selectedThirdLevel === "all" ||
      item.thirdLevelCategory.toLowerCase() ===
        selectedThirdLevel.toLowerCase();

    return (
      matchesTab &&
      matchesSearch &&
      matchesCategory &&
      matchesSubCategory &&
      matchesThirdLevel
    );
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    activeTab,
    selectedCategory,
    selectedSubCategory,
    selectedThirdLevel,
  ]);

  useEffect(() => {
    const initialSlides = {};
    items.forEach((item) => {
      initialSlides[item._id] = 0;
    });
    setCurrentSlide(initialSlides);
  }, [items]);

  const nextSlide = (id, len) => {
    setCurrentSlide((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? (prev[id] + 1) % len : 0,
    }));
  };

  const prevSlide = (id, len) => {
    setCurrentSlide((prev) => ({
      ...prev,
      [id]: prev[id] !== undefined ? (prev[id] - 1 + len) % len : 0,
    }));
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteFashionItem(id).unwrap();
      toast.success("Product deleted successfully!");
      setCurrentPage(1);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete product");
    }
  };

  const handleMultiImageSelect = (itemId, index, file) => {
    if (file) {
      setSelectedUpdates((prev) => ({
        ...prev,
        [itemId]: { ...(concomitant[itemId] || {}), [index]: file },
      }));
    }
  };

  const handleAddNewImage = (itemId, files) => {
    if (files?.length) {
      setNewImages((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), ...Array.from(files)],
      }));
    }
  };

  const handleMultiImageUpdate = async (fashionId) => {
    const updateMap = selectedUpdates[fashionId] || {};
    const additionalImages = newImages[fashionId] || [];

    if (!Object.keys(updateMap).length && !additionalImages.length) {
      toast.error("Please select images to update");
      return;
    }

    const formData = new FormData();
    Object.entries(updateMap).forEach(([index, file]) => {
      formData.append("replaceFiles", file);
    });
    additionalImages.forEach((file) => formData.append("newFiles", file));
    formData.append("updateMap", JSON.stringify(updateMap));

    try {
      await updateFashionImagesByIndex({
        id: fashionId,
        body: formData,
      }).unwrap();
      toast.success("Product images updated successfully!");
      setSelectedUpdates((prev) => {
        const updated = { ...prev };
        delete updated[fashionId];
        return updated;
      });
      setNewImages((prev) => {
        const updated = { ...prev };
        delete updated[fashionId];
        return updated;
      });
      setCurrentPage(1);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update images");
    }
  };

  const handleFieldChange = (field, value) => {
    if (field === "rating") {
      const numValue = value === "" ? "" : Number(value);
      if (value === "" || (numValue >= 0 && numValue <= 5)) {
        setEditFields((prev) => ({ ...prev, [field]: value }));
      }
    } else if (field === "sizes") {
      const { checked } = value.target;
      const size = value.target.value;
      setEditFields((prev) =>
        checked
          ? { ...prev, sizes: [...(prev.sizes || []), size] }
          : { ...prev, sizes: (prev.sizes || []).filter((s) => s !== size) }
      );
    } else {
      setEditFields((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleUpdateItemFields = async () => {
    if (!editItem) return;
    try {
      const ratingValue = editFields.rating
        ? Number.isInteger(Number(editFields.rating))
          ? Number(editFields.rating)
          : parseFloat(editFields.rating)
        : editItem.rating;

      const payload = {
        ...editItem,
        ...editFields,
        sizes: editFields.sizes || editItem.sizes || [],
        rating: ratingValue,
      };
      await updateFashionItem({ id: editItem._id, body: payload }).unwrap();
      toast.success("Product updated successfully!");
      closeEditDialog();
      setCurrentPage(1);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update product");
    }
  };

  const openEditDialog = (item) => {
    setEditItem(item);
    setEditFields({
      name: item.name,
      brand: item.brand,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      inStock: item.inStock,
      description: item.description,
      sizes: item.sizes || [],
      rating: item.rating ? item.rating.toString() : "",
      category: item.category || "",
      subCategory: item.subCategory || "",
      thirdLevelCategory: item.thirdLevelCategory || "",
    });
  };

  const closeEditDialog = () => {
    setEditItem(null);
    setEditFields({});
  };

  const openAddDialog = () => {
    setShowAddDialog(true);
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => (
    <div className="flex justify-between items-center mt-4 px-4 py-3 bg-white rounded-xl shadow-lg border border-gray-100">
      <div className="text-sm text-gray-600">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
        {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of{" "}
        {filteredItems.length} products
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Previous page"
        >
          <FaChevronLeft />
        </button>
        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              currentPage === page
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            aria-label={`Page ${page}`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Next page"
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );

  const renderStarRating = (rating) => {
    const stars = [];
    const maxStars = 5;
    const roundedRating = rating ? Math.round(rating * 2) / 2 : 0;

    for (let i = 1; i <= maxStars; i++) {
      if (i <= roundedRating) {
        stars.push(
          <FaStar key={i} className="text-yellow-500 text-xs sm:text-sm" />
        );
      } else if (i - 0.5 === roundedRating) {
        stars.push(
          <FaStarHalfAlt
            key={i}
            className="text-yellow-500 text-xs sm:text-sm"
          />
        );
      } else {
        stars.push(
          <FaStar key={i} className="text-gray-300 text-xs sm:text-sm" />
        );
      }
    }

    return (
      <div className="flex flex-col items-center gap-1 sm:gap-2">
        <div className="flex gap-1">{stars}</div>
        <span className="text-xs sm:text-sm text-gray-500">
          ({rating ? rating.toFixed(1) : "N/A"})
        </span>
      </div>
    );
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      <div className="relative z-10">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg">
                  <MdDashboard className="text-2xl sm:text-3xl text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Fashion Dashboard
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 sm:mt-2 flex items-center gap-2">
                    <HiSparkles className="text-yellow-300" />
                    Manage your fashion inventory with style
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                  <HiCollection className="text-xl sm:text-2xl mx-auto mb-2 text-white" />
                  <div className="text-lg sm:text-2xl font-bold text-white">
                    {items.length}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-100">
                    Total Products
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 text-center border border-white/20">
                  <BiTrendingUp className="text-xl sm:text-2xl mx-auto text-green-600 font-bold" />
                  <div className="text-lg sm:text-2xl font-bold text-white">
                    {brands.length}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-100">Brands</div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <button
                onClick={() => {
                  refetch();
                  setCurrentPage(1);
                }}
                className="flex items-center justify-center gap-2 cursor-pointer sm:gap-3 bg-white/20 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:bg-white/30 transition-all shadow-lg hover:shadow-xl border border-white/20 font-medium hover:scale-105 text-sm sm:text-base"
                disabled={isLoading}
                aria-label="Refresh products"
              >
                {isLoading ? (
                  <AuthButtonLoader />
                ) : (
                  <>
                    <FaSync /> Refresh
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  openAddDialog();
                  categoryRefetch();
                }}
                className="flex items-center justify-center gap-2 cursor-pointer sm:gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl font-medium hover:scale-105 text-sm sm:text-base"
                aria-label="Add product"
              >
                <FaPlus /> Add Product
              </button>
            </div>
          </div>
          <div className="relative w-full">
            <FaSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Search products, brands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/10 border border-white/20 text-white placeholder-white/60 px-10 sm:px-12 py-3 sm:py-4 rounded-xlHive xl focus:ring-4 focus:ring-white/30 transition-all text-sm sm:text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="mb-4 sm:mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 py-3 px-4 rounded-xl overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            value: activeTab,
            onChange: setActiveTab,
            options: ["all", ...brands],
            label: "All Brands",
            icon: <FaFilter />,
          },
          {
            value: selectedCategory,
            onChange: setSelectedCategory,
            options: ["all", CATEGORY],
            label: "All Categories",
            icon: <FaFilter />,
          },
          {
            value: selectedSubCategory,
            onChange: setSelectedSubCategory,
            options: ["all", ...subCategories],
            label: "All Subcategories",
            icon: <FaFilter />,
          },
          {
            value: selectedThirdLevel,
            onChange: setSelectedThirdLevel,
            options: ["all", ...thirdLevelCategories],
            label: "All Third Level",
            icon: <FaFilter />,
          },
        ].map(({ value, onChange, options, label, icon }, idx) => (
          <div key={idx} className="relative w-full">
            <select
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                if (idx === 1) {
                  setSelectedSubCategory("all");
                  setSelectedThirdLevel("all");
                }
                if (idx === 2) setSelectedThirdLevel("all");
              }}
              className="appearance-none bg-white text-gray-700 px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold border border-gray-200 hover:bg-gray-50 focus:ring-4 focus:ring-indigo-200 transition-all cursor-pointer pr-8 sm:pr-10 w-full"
            >
              <option value="all" className="min-h-[40px]">
                {icon} {label}
              </option>
              {options.slice(1).map((opt) => (
                <option key={opt} value={opt} className="min-h-[40px]">
                  <FaList className="inline mr-1" /> {opt}
                </option>
              ))}
            </select>
            <FaChevronRight className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none text-xs sm:text-sm" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 animate-pulse">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-2/3"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
      <div className="relative mb-6 sm:mb-8">
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
          <GiClothes className="text-white text-4xl sm:text-6xl" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-full blur-xl opacity-30 -z-10"></div>
      </div>
      <h3 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3 sm:mb-4">
        No Products Found
      </h3>
      <p className="text-gray-600 mb-6 sm:mb-8 max-w-md text-center text-sm sm:text-base">
        {activeTab === "all" &&
        selectedCategory === "all" &&
        selectedSubCategory === "all" &&
        selectedThirdLevel === "all"
          ? "There are currently no fashion products in your inventory. Start by adding some amazing products!"
          : "No products found for the selected filters. Try different filters or add products."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={() => {
            refetch();
            setCurrentPage(1); // Reset to page 1 on refresh
          }}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-semibold hover:scale-105 text-sm sm:text-base"
          disabled={isLoading}
          aria-label="Refresh products"
        >
          {isLoading ? (
            <AuthButtonLoader />
          ) : (
            <>
              <FaSync className="animate-spin" /> Refresh Products
            </>
          )}
        </button>
        <button
          onClick={openAddDialog}
          className="flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg hover:shadow-xl font-semibold hover:scale-105 text-sm sm:text-base"
          aria-label="Add product"
        >
          <FaPlus /> Add Product
        </button>
      </div>
    </div>
  );

  const renderProductTable = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-h-[35rem] overflow-auto scrollbar-red">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Image
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Name
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Brand
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Price
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Stock
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Sizes
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Rating
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Category
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item) => {
              const active = currentSlide[item._id] ?? 0;
              const discountPercentage = Math.round(
                ((item.originalPrice - item.discountedPrice) /
                  item.originalPrice) *
                  100
              );

              return (
                <tr
                  key={item._id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div className="relative w-16 h-16">
                      {item.image.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`${item.name} - Image ${idx + 1}`}
                          className={`absolute inset-0 object-cover object-top w-full h-full rounded-lg transition-all duration-700 ${
                            idx === active
                              ? "opacity-100 scale-100"
                              : "opacity-0 scale-110"
                          }`}
                          loading="lazy"
                        />
                      ))}
                      {item.image.length > 1 && (
                        <>
                          <button
                            onClick={() =>
                              prevSlide(item._id, item.image.length)
                            }
                            className="absolute left-0 top-1/2 -translate-y-1/2 bg-amber-200 text-gray-800 p-1 rounded-full hover:bg-white shadow-lg transition-all cursor-pointer transform hover:scale-110 border border-white/20"
                            aria-label="Previous image"
                          >
                            <FaChevronLeft className="text-xs" />
                          </button>
                          <button
                            onClick={() =>
                              nextSlide(item._id, item.image.length)
                            }
                            className="absolute right-0 top-1/2 -translate-y-1/2 bg-amber-200 text-gray-800 p-1 rounded-full hover:bg-white shadow-lg transition-all cursor-pointer transform hover:scale-110 border border-white/20"
                            aria-label="Next image"
                          >
                            <FaChevronRight className="text-xs" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900 font-medium grid gap-4">
                    {item.name}
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        Manage Images
                      </summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                          {item.image.map((img, idx) => (
                            <label
                              key={idx}
                              className="relative block w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-400 cursor-pointer"
                            >
                              <img
                                src={
                                  selectedUpdates[item._id]?.[idx]
                                    ? URL.createObjectURL(
                                        selectedUpdates[item._id][idx]
                                      )
                                    : img
                                }
                                alt={`Image ${idx + 1}`}
                                className="w-full h-full object-cover object-top"
                              />
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleMultiImageSelect(
                                    item._id,
                                    idx,
                                    e.target.files[0]
                                  )
                                }
                              />
                            </label>
                          ))}
                          {newImages[item._id]?.map((img, idx) => (
                            <div
                              key={`new-${idx}`}
                              className="relative block w-12 h-12 rounded-lg overflow-hidden border border-green-200"
                            >
                              <img
                                src={URL.createObjectURL(img)}
                                alt={`New Image ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs"
                                onClick={() =>
                                  setNewImages((prev) => ({
                                    ...prev,
                                    [item._id]: prev[item._id].filter(
                                      (_, i) => i !== idx
                                    ),
                                  }))
                                }
                                aria-label="Remove new image"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                          <label className="flex items-center justify-center w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer text-gray-400 hover:text-indigo-600">
                            <FaPlus className="text-xs" />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) =>
                                handleAddNewImage(
                                  item._id,
                                  Array.from(e.target.files)
                                )
                              }
                            />
                          </label>
                        </div>
                        {(selectedUpdates[item._id] || newImages[item._id]) && (
                          <button
                            onClick={() => handleMultiImageUpdate(item._id)}
                            disabled={isUpdatingImages}
                            className="mt-2 bg-indigo-500 text-white px-4 py-1 rounded-lg text-xs hover:bg-indigo-600 disabled:opacity-50"
                            aria-label="Update images"
                          >
                            {isUpdatingImages ? (
                              <AuthButtonLoader size="small" />
                            ) : (
                              "Update Images"
                            )}
                          </button>
                        )}
                      </div>
                    </details>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl py-2 px-2 text-center">
                      <span className="text-xs font-semibold text-black">
                        {item.brand}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-center">
                    <div className="inline-flex items-center gap-2">
                      {item.originalPrice > item.discountedPrice && (
                        <span className="text-green-600 font-semibold">
                          ₹{item.discountedPrice.toLocaleString()}
                        </span>
                      )}
                      <span className="text-red-500 line-through">
                        ₹{item.originalPrice.toLocaleString()}
                      </span>
                    </div>
                    {discountPercentage > 0 && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full inline-block mt-1">
                        {discountPercentage}% OFF
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span
                      className={`${
                        item.inStock > 0 ? "text-green-700" : "text-red-700"
                      } font-medium`}
                    >
                      {item.inStock > 0 ? `${item.inStock}` : "Out of stock"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-sm">
                    <span className="grid grid-cols-2 place-items-center gap-2">
                      {item.sizes?.map((size) => (
                        <span
                          key={size}
                          className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-xs"
                        >
                          {size}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm">
                    {renderStarRating(item.rating)}
                  </td>
                  <td className="py-4 px-4 text-sm">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-300 px-2 py-1 rounded-lg text-gray-800 font-medium">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditDialog(item)}
                        className="bg-indigo-500 text-white p-2 rounded-full hover:bg-indigo-600 transition-all cursor-pointer"
                        aria-label="Edit product"
                      >
                        <FaEdit />
                      </button>
                      <button
                        disabled={isDeleting}
                        onClick={() => handleDeleteItem(item._id)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all cursor-pointer"
                        aria-label="Delete product"
                      >
                        {isDeleting ? (
                          <AuthButtonLoader size="small" />
                        ) : (
                          <FaTrash />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

  const renderEditModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-6 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl max-h-[90vh] overflow-hidden animate-fade-in border border-gray-200">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FaEdit className="text-2xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Edit Product</h3>
                <p className="text-blue-100 text-sm">
                  Update product information
                </p>
              </div>
            </div>
            <button
              onClick={closeEditDialog}
              className="text-white/80 hover:text-white rounded-full p-3 transition-all cursor-pointer hover:bg-white/10 hover:scale-110"
              disabled={isUpdating}
              aria-label="Close edit modal"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>
        </div>
        <div className="p-8 max-h-[calc(90vh-120px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HiSparkles className="text-indigo-500" /> Basic Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <GiClothes className="text-indigo-500" /> Product Name
                    </label>
                    <input
                      type="text"
                      value={editFields.name || ""}
                      onChange={(e) =>
                        handleFieldChange("name", e.target.value)
                      }
                      className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white shadow-sm"
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaTag className="text-indigo-500" /> Brand
                    </label>
                    <input
                      type="text"
                      value={editFields.brand || ""}
                      onChange={(e) =>
                        handleFieldChange("brand", e.target.value)
                      }
                      className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white shadow-sm"
                      placeholder="Enter brand name"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HiTrendingUp className="text-green-500" /> Pricing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Original Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editFields.originalPrice || ""}
                      onChange={(e) =>
                        handleFieldChange("originalPrice", e.target.value)
                      }
                      className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-400 transition-all bg-white shadow-sm"
                      placeholder="Original price"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discounted Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editFields.discountedPrice || ""}
                      onChange={(e) =>
                        handleFieldChange("discountedPrice", e.target.value)
                      }
                      className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-400 transition-all bg-white shadow-sm"
                      placeholder="Discounted price"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                <h4 className="text-lg urod font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaBoxOpen className="text-purple-500" /> Inventory & Details
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaBoxOpen className="text-purple-500" /> Stock Quantity
                      </label>
                      <input
                        type="number"
                        value={editFields.inStock || ""}
                        onChange={(e) =>
                          handleFieldChange("inStock", e.target.value)
                        }
                        className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white shadow-sm"
                        placeholder="Quantity in stock"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaStar className="text-yellow-500" /> Rating
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={editFields.rating || ""}
                        onChange={(e) =>
                          handleFieldChange("rating", e.target.value)
                        }
                        className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white shadow-sm"
                        placeholder="Enter rating (0-5)"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaShapes className="text-purple-500" /> Available Sizes
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {SIZES.map((s) => (
                        <label
                          key={s}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={s}
                            checked={editFields.sizes?.includes(s) || false}
                            onChange={(e) =>
                              handleFieldChange("sizes", { target: e.target })
                            }
                            className="h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-100">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FaList className="text-orange-500" /> Categories
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={editFields.category || ""}
                      onChange={(e) =>
                        handleFieldChange("category", e.target.value)
                      }
                      className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm"
                      placeholder="Enter category"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        value={editFields.subCategory || ""}
                        onChange={(e) =>
                          handleFieldChange("subCategory", e.target.value)
                        }
                        className="等多种 w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm"
                        placeholder="Enter subcategory"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 mb-2">
                        Third Level
                      </label>
                      <input
                        type="text"
                        value={editFields.thirdLevelCategory || ""}
                        onChange={(e) =>
                          handleFieldChange(
                            "thirdLevelCategory",
                            e.target.value
                          )
                        }
                        className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm"
                        placeholder="Enter third level category"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-xl border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FaInfoCircle className="text-gray-500" /> Product Description
            </h4>
            <textarea
              rows="4"
              value={editFields.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              className="w-full border-2 border-gray-200 px-4 py-3 rounded-xl focus:ring-4 focus:ring-gray-200 focus:border-gray-400 transition-all bg-white shadow-sm resize-none"
              placeholder="Enter detailed product description..."
            />
          </div>
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-4">
            <button
              onClick={closeEditDialog}
              className="px-8 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all cursor-pointer shadow-md hover:shadow-lg font-semibold hover:scale-105"
              disabled={isUpdating}
              aria-label="Cancel edit"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateItemFields}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all cursor-pointer shadow-lg hover:shadow-xl flex items-center gap-3 font-semibold hover:scale-105"
              disabled={isUpdating}
              aria-label="Save changes"
            >
              {isUpdating ? (
                <AuthButtonLoader size="small" />
              ) : (
                <>
                  <FaEdit /> Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-blue-400 to-indigo-100 p-4 sm:p-6 w-full">
      {renderHeader()}
      {renderFilters()}
      {isLoading ? (
        renderLoadingState()
      ) : filteredItems.length ? (
        <>{renderProductTable()}</>
      ) : (
        renderEmptyState()
      )}
      {editItem && renderEditModal()}
      {showAddDialog && (
        <AddFashionItem
          onClose={closeAddDialog}
          refetch={refetch}
          categoryData={categoryData}
          fashionBrands={fashionBrands}
          brandRefetch={brandRefetch}
        />
      )}
    </div>
  );
};

export default ShowAllFashionProduct;
