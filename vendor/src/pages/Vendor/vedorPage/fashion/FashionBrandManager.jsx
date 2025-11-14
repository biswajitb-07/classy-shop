import { useState } from "react";
import {
  useGetBrandsQuery,
  useAddBrandMutation,
  useDeleteBrandMutation,
  useUpdateBrandListMutation,
} from "../../../../features/api/fashion/fashionBrandApi";
import {
  FaTrash,
  FaPlus,
  FaEdit,
  FaCheck,
  FaTimes,
  FaStar,
} from "react-icons/fa";
import toast from "react-hot-toast";

const FashionBrandManager = () => {
  const [deletingBrand, setDeletingBrand] = useState(null);

  const { data, isLoading, isError } = useGetBrandsQuery();
  const [addBrand, { isLoading: isAdding }] = useAddBrandMutation();
  const [deleteBrand] = useDeleteBrandMutation();
  const [updateBrandList, { isLoading: isUpdating }] =
    useUpdateBrandListMutation();

  const brands = data?.brand || [];

  const [newBrand, setNewBrand] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const handleAddBrand = async () => {
    if (!newBrand.trim()) return toast.error("Brand name is required.");
    try {
      await addBrand({ newBrand: newBrand.trim() }).unwrap();
      setNewBrand("");
      toast.success("Brand added!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add brand.");
    }
  };

  const handleDeleteBrand = async (brand) => {
    setDeletingBrand(brand);
    try {
      await deleteBrand({ brandToRemove: brand }).unwrap();
      toast.error("Brand deleted!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete brand.");
    } finally {
      setDeletingBrand(null);
    }
  };

  const handleStartEdit = (index, current) => {
    setEditingIndex(index);
    setEditValue(current);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleSaveEdit = async (oldBrand) => {
    if (!editValue.trim()) return toast.error("Brand name can't be empty.");
    const updatedBrands = brands.map((b) =>
      b === oldBrand ? editValue.trim() : b
    );
    try {
      await updateBrandList({ brand: updatedBrands }).unwrap();
      toast.success("Brand updated!");
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update brand.");
    } finally {
      handleCancelEdit();
    }
  };

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaTimes className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-red-600 font-medium text-sm sm:text-base">
            Failed to load brands. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-100 pb-5">
      <div className="container mx-auto">
        {/* Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 rounded-3xl shadow-2xl mb-6 sm:mb-8">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full -translate-y-12 sm:-translate-y-16 translate-x-12 sm:translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-20 sm:w-24 h-20 sm:h-24 bg-white/5 rounded-full translate-y-10 sm:translate-y-12 -translate-x-10 sm:-translate-x-12"></div>

          <div className="relative p-6 sm:p-8 md:p-12">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 sm:w-14 h-12 sm:h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FaStar className="text-white text-xl sm:text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
                  Fashion Brand Manager
                </h1>
                <p className="text-purple-100 text-sm sm:text-base md:text-lg">
                  Create and manage your luxury brand collection
                </p>
              </div>
            </div>

            {/* Add Brand Form */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    className="w-full bg-white/90 backdrop-blur-sm border-0 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-white/50 outline-none shadow-lg text-base sm:text-lg font-medium transition-all duration-200"
                    placeholder="✨ Enter luxury brand name..."
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddBrand()}
                  />
                </div>
                <button
                  className="bg-white text-purple-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:bg-purple-50 disabled:opacity-50 flex items-center justify-center gap-2 sm:gap-3 cursor-pointer font-bold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  onClick={handleAddBrand}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <div className="w-5 sm:w-6 h-5 sm:h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FaPlus className="text-base sm:text-xl" />
                  )}
                  Add Brand
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FaStar className="text-white text-base sm:text-lg" />
              </div>
              <h2 className="text-base md:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Premium Brand Collection
              </h2>
              <div className="ml-auto text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-bold">
                {brands.length} {brands.length === 1 ? "Brand" : "Brands"}
              </div>
            </div>

            <div className="space-y-4 max-h-[24rem] sm:max-h-96 overflow-y-auto pr-2 custom-scrollbar">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 sm:h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl animate-pulse shadow-md"
                  ></div>
                ))
              ) : brands.length > 0 ? (
                brands.map((brand, index) => (
                  <div
                    key={index}
                    className="group relative bg-gradient-to-r from-white via-purple-50/30 to-pink-50/30 backdrop-blur-sm border border-purple-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-pink-500/0 to-indigo-500/0 group-hover:from-purple-500/5 group-hover:via-pink-500/5 group-hover:to-indigo-500/5 transition-all duration-300"></div>

                    <div className="relative flex items-center justify-between p-4 sm:p-6">
                      {editingIndex === index ? (
                        <div className="flex flex-1 items-center gap-3 sm:gap-4">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 bg-white/80 backdrop-blur-sm border border-purple-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 outline-none focus:ring-2 focus:ring-purple-300 cursor-pointer text-base sm:text-lg font-medium shadow-md"
                            onKeyPress={(e) =>
                              e.key === "Enter" && handleSaveEdit(brand)
                            }
                          />
                          <button
                            className="w-10 sm:w-12 h-10 sm:h-12 bg-green-500 hover:bg-green-600 text-white rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                            onClick={() => handleSaveEdit(brand)}
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <FaCheck className="text-base sm:text-lg" />
                            )}
                          </button>
                          <button
                            className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-400 hover:bg-gray-500 text-white rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                            onClick={handleCancelEdit}
                          >
                            <FaTimes className="text-base sm:text-lg" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-base sm:text-lg">
                                {brand.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-lg sm:text-xl font-bold text-gray-800 tracking-wide">
                              {brand}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <button
                              className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105"
                              onClick={() => handleStartEdit(index, brand)}
                            >
                              <FaEdit className="text-base sm:text-lg" />
                            </button>
                            <button
                              className="w-10 sm:w-12 h-10 sm:h-12 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                              onClick={() => handleDeleteBrand(brand)}
                              disabled={deletingBrand === brand}
                            >
                              {deletingBrand === brand ? (
                                <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <FaTrash className="text-base sm:text-lg" />
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 sm:py-16">
                  <div className="w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <FaStar className="text-purple-400 text-2xl sm:text-3xl" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-600 mb-2">
                    No brands yet
                  </h3>
                  <p className="text-gray-500 text-sm sm:text-lg">
                    Start building your luxury brand collection above!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FashionBrandManager;
