import { useState } from "react";
import { useAddBagItemMutation } from "../../../../features/api/bag/bagApi";
import {
  FaPlus,
  FaTimes,
  FaImage,
  FaList,
  FaBoxOpen,
  FaStar,
  FaInfoCircle,
  FaTag,
} from "react-icons/fa";
import { HiSparkles, HiTrendingUp } from "react-icons/hi";
import { MdLuggage } from "react-icons/md";
import AuthButtonLoader from "../../../../component/Loader/AuthButtonLoader";
import toast from "react-hot-toast";

const AddBagItem = ({
  onClose,
  refetch,
  categoryData,
  fashionBrands,
  brandRefetch,
}) => {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    originalPrice: "",
    discountedPrice: "",
    inStock: "",
    rating: "",
    description: "",
    category: "",
    subCategory: "",
    thirdLevelCategory: "",
  });
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [addProduct, { isLoading }] = useAddBagItemMutation();

  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "rating") {
      const floatVal = parseFloat(value);
      if (floatVal > 5) {
        newValue = "5";
      } else if (floatVal < 0) {
        newValue = "0";
      }
    }

    setForm((prev) => {
      const updated = { ...prev, [name]: newValue };

      if (name === "category") {
        updated.subCategory = "";
        updated.thirdLevelCategory = "";
      } else if (name === "subCategory") {
        updated.thirdLevelCategory = "";
      }

      return updated;
    });
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setImages([...images, ...files]);
    setPreviews([...previews, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (idx) => {
    setImages(images.filter((_, i) => i !== idx));
    setPreviews(previews.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("brand", form.brand);
    formData.append("originalPrice", form.originalPrice);
    formData.append("discountedPrice", form.discountedPrice);
    formData.append("inStock", form.inStock);
    formData.append("rating", form.rating);
    formData.append("description", form.description);
    formData.append("category", form.category);
    formData.append("subCategory", form.subCategory);
    formData.append("thirdLevelCategory", form.thirdLevelCategory);
    images.forEach((img) => formData.append("image", img));

    try {
      await addProduct(formData).unwrap();
      toast.success("Product added successfully!");
      setForm({
        name: "",
        brand: "",
        originalPrice: "",
        discountedPrice: "",
        inStock: "",
        rating: "",
        description: "",
        category: "",
        subCategory: "",
        thirdLevelCategory: "",
      });
      setImages([]);
      setPreviews([]);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to add product");
    }
  };

  const brands = fashionBrands.brand || [];
  const categories = categoryData.categories || [];
  const subCategories = form.category
    ? categories.find((cat) => cat.name === form.category)?.subCategories || []
    : [];

  const thirdLevelCategories = form.subCategory
    ? subCategories.find((sub) => sub.name === form.subCategory)
        ?.thirdLevelSubCategories || []
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] sm:max-h-[95vh] overflow-hidden animate-fade-in border border-gray-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 sm:px-6 md:px-8 py-4 sm:py-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative z-10 flex justify-between items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FaPlus className="text-xl sm:text-2xl" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold">
                  Add New Bag
                </h3>
                <p className="text-blue-100 text-xs sm:text-sm">
                  Create a new bag product
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white focus:ring-2 focus:ring-white/30 rounded-full p-2 sm:p-3 transition-all cursor-pointer hover:bg-white/10 transform hover:scale-110"
              disabled={isLoading}
              aria-label="Close add modal"
            >
              <FaTimes className="text-lg sm:text-xl" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <form
          onSubmit={handleSubmit}
          className="p-4 sm:p-6 md:p-8 max-h-[calc(90vh-100px)] sm:max-h-[calc(95vh-120px)] overflow-y-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Left Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-blue-100">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <HiSparkles className="text-indigo-500" />
                  Basic Information
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <MdLuggage className="text-indigo-500" />
                      Product Name
                    </label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaTag className="text-indigo-500" />
                      Brand
                    </label>
                    <select
                      required
                      name="brand"
                      value={form.brand}
                      onChange={handleChange}
                      onClick={brandRefetch}
                      className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                    >
                      <option value="" disabled>
                        Select Brand
                      </option>
                      {brands.map((brand, index) => (
                        <option key={index} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6 rounded-xl border border-green-100">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <HiTrendingUp className="text-green-500" />
                  Pricing
                </h4>
                <div className="grid gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Original Price (₹)
                    </label>
                    <input
                      required
                      type="number"
                      name="originalPrice"
                      value={form.originalPrice}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                      placeholder="Original price"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Discounted Price (₹)
                    </label>
                    <input
                      required
                      type="number"
                      name="discountedPrice"
                      value={form.discountedPrice}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-green-200 focus:border-green-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                      placeholder="Discounted price"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-xl border border-purple-100">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <FaBoxOpen className="text-purple-500" />
                  Inventory & Details
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaBoxOpen className="text-purple-500" />
                        Stock Quantity
                      </label>
                      <input
                        required
                        type="number"
                        name="inStock"
                        value={form.inStock}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                        placeholder="Quantity in stock"
                      />
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FaStar className="text-yellow-500" />
                        Rating
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        name="rating"
                        value={form.rating}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                        placeholder="Enter rating (0-5)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 sm:p-6 rounded-xl border border-orange-100">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
                  <FaList className="text-orange-500" />
                  Categories
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      required
                      name="category"
                      value={form.category}
                      onChange={handleChange}
                      className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                    >
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Subcategory
                      </label>
                      <select
                        name="subCategory"
                        value={form.subCategory}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                        disabled={!form.category}
                      >
                        <option value="" disabled>
                          Select subcategory
                        </option>
                        {subCategories.map((sub) => (
                          <option key={sub.name} value={sub.name}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                        Third Level
                      </label>
                      <select
                        name="thirdLevelCategory"
                        value={form.thirdLevelCategory}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-orange-200 focus:border-orange-400 transition-all bg-white shadow-sm text-sm sm:text-base"
                        disabled={!form.subCategory}
                      >
                        <option value="" disabled>
                          Select third level category
                        </option>
                        {thirdLevelCategories.map((third) => (
                          <option key={third.name} value={third.name}>
                            {third.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-6 sm:mt-8 bg-gradient-to-br from-amber-200 to-slate-200 p-4 sm:p-6 rounded-xl border border-gray-200">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FaInfoCircle className="text-gray-500" />
              Product Description
            </h4>
            <textarea
              required
              name="description"
              rows="4"
              value={form.description}
              onChange={handleChange}
              className="w-full border-2 border-gray-200 px-3 sm:px-4 py-2 sm:py-3 rounded-xl focus:ring-4 focus:ring-gray-200 focus:border-gray-400 transition-all bg-white shadow-sm resize-none text-sm sm:text-base"
              placeholder="Enter detailed product description..."
            />
          </div>

          {/* Images Section */}
          <div className="mt-5 bg-gradient-to-br from-red-200 to-gray-300 p-4 sm:p-6 rounded-xl border border-gray-200">
            <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <FaImage className="text-gray-500" />
              Product Images (Max 5)
            </h4>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImages}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
            />
            {previews.length > 0 && (
              <div className="flex items-center gap-4 mt-4 ">
                {previews.map((url, idx) => (
                  <div key={idx} className="relative group ">
                    <img
                      src={url}
                      alt="preview"
                      className="w-28 object-cover rounded-lg border border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-0 right-1 cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 md:w-6 md:h-6 flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <FaTimes className="text-[10px] md:text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-4 md:px-8 py-5 flex flex-row justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 focus:ring-4 focus:ring-gray-200 transition-all cursor-pointer shadow-md hover:shadow-lg font-semibold transform hover:scale-105"
              disabled={isLoading}
              aria-label="Cancel add"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 focus:ring-4 focus:ring-indigo-200 transition-all cursor-pointer shadow-lg hover:shadow-xl flex items-center gap-2 sm:gap-3 font-semibold transform hover:scale-105"
              disabled={isLoading}
              aria-label="Add product"
            >
              {isLoading ? (
                <AuthButtonLoader size="small" />
              ) : (
                <>
                  <FaPlus /> Add Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBagItem;
