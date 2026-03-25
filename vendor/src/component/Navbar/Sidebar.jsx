import { useState } from "react";
import { MdOutlineDashboard } from "react-icons/md";
import { TbBrandSnapchat, TbCategoryPlus } from "react-icons/tb";
import { RiProductHuntLine } from "react-icons/ri";
import { AiOutlineLogout, AiOutlineClose } from "react-icons/ai";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { IoBagCheckOutline } from "react-icons/io5";
import { FiUsers } from "react-icons/fi";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../features/authSlice";
import { useNavigate } from "react-router-dom";
import {
  useGetDashboardSummaryQuery,
  useLogoutUserMutation,
} from "../../features/api/authApi";
import { toast } from "react-hot-toast";
import AuthButtonLoader from "../../component/Loader/AuthButtonLoader";

const Sidebar = () => {
  const { isOpen } = useSelector((store) => store.auth);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [logoutUser, { isLoading: logoutIsLoading }] = useLogoutUserMutation();
  const { data: summaryData } = useGetDashboardSummaryQuery();
  const summary = summaryData?.summary;

  const toggleAccordion = (key) => {
    setOpenAccordion(openAccordion === key ? null : key);
  };

  const closeSidebar = () => {
    dispatch(toggleSidebar());
  };

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err?.data?.message || "Logout failed");
    }
  };

  return (
    <>
      <div
        className={`bg-white shadow-md h-screen fixed top-0 left-0 z-50 transition-all duration-300 overflow-y-auto ${
          isOpen ? "w-[18rem] px-5 py-5" : "w-0 px-0"
        }`}
      >
        <div
          className={`flex flex-col justify-center gap-8 transition-opacity duration-300 ${
            !isOpen && "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between">
            <img src="./logo.jpg" alt="logo" className="w-28 md:w-40" />
            <AiOutlineClose
              onClick={closeSidebar}
              size={23}
              className="cursor-pointer transition hover:rotate-90 bg-red-500 text-white lg:hidden"
            />
          </div>

          <ul className="flex flex-col gap-4">
            <li
              onClick={() => navigate("/")}
              className="flex items-center gap-4 text-gray-700 font-bold text-sm hover:text-gray-900 cursor-pointer hover:bg-gray-200 px-2 py-2 rounded"
            >
              <MdOutlineDashboard size={20} />
              Dashboard
            </li>

            {/* Category */}
            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("category")}
                className="flex items-center justify-between gap-2 hover:bg-gray-200 px-2 py-2 rounded w-full cursor-pointer"
              >
                <div className="flex items-center gap-4 text-gray-700 font-bold text-sm">
                  <TbCategoryPlus size={20} />
                  Category
                </div>
                {openAccordion === "category" ? (
                  <IoIosArrowUp />
                ) : (
                  <IoIosArrowDown />
                )}
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  openAccordion === "category"
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="ml-16 mt-2 mb-2 flex flex-col gap-4 text-gray-600 text-sm font-semibold list-disc">
                    <li
                      onClick={() => navigate("/category-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Category List
                    </li>
                    <li
                      onClick={() => navigate("/category")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Add Category
                    </li>
                  </ul>
                </div>
              </div>
            </li>

            {/* Brands */}
            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("brands")}
                className="flex items-center justify-between gap-2 hover:bg-gray-200 px-2 py-2 rounded w-full cursor-pointer"
              >
                <div className="flex items-center gap-4 text-gray-700 font-bold text-sm">
                  <TbBrandSnapchat size={20} />
                  Brands
                </div>
                {openAccordion === "brands" ? (
                  <IoIosArrowUp />
                ) : (
                  <IoIosArrowDown />
                )}
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  openAccordion === "brands"
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="ml-16 mt-2 mb-2 flex flex-col gap-4 text-gray-600 text-sm font-semibold list-disc">
                    <li
                      onClick={() => navigate("/fashion-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Fashion Brands
                    </li>
                    <li
                      onClick={() => navigate("/electronic-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Electronic Brands
                    </li>
                    <li
                      onClick={() => navigate("/bag-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Bag Brands
                    </li>
                    <li
                      onClick={() => navigate("/grocery-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Grocery Brands
                    </li>
                    <li
                      onClick={() => navigate("/footwear-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Footwear Brands
                    </li>
                    <li
                      onClick={() => navigate("/beauty-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Beauty Brands
                    </li>
                    <li
                      onClick={() => navigate("/wellness-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Wellness Brands
                    </li>
                    <li
                      onClick={() => navigate("/jewellery-brand-list")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Jewellerey Brands
                    </li>
                  </ul>
                </div>
              </div>
            </li>

            {/* Product */}
            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("product")}
                className="flex items-center justify-between gap-2 hover:bg-gray-200 px-2 py-2 rounded w-full cursor-pointer"
              >
                <div className="flex items-center gap-4 text-gray-700 font-bold text-sm">
                  <RiProductHuntLine size={20} />
                  Product
                </div>
                {openAccordion === "product" ? (
                  <IoIosArrowUp />
                ) : (
                  <IoIosArrowDown />
                )}
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  openAccordion === "product"
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="ml-16 mt-2 mb-2 flex flex-col gap-4 text-gray-600 text-sm font-semibold list-disc">
                    <li
                      onClick={() => navigate("/fashion-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Fashion Product
                    </li>
                    <li
                      onClick={() => navigate("/electronic-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Electronic Product
                    </li>
                    <li
                      onClick={() => navigate("/grocery-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Grocery Product
                    </li>
                    <li
                      onClick={() => navigate("/footwear-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Footwear Product
                    </li>
                    <li
                      onClick={() => navigate("/bag-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Bag Product
                    </li>
                    <li
                      onClick={() => navigate("/beauty-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Beauty Product
                    </li>
                    <li
                      onClick={() => navigate("/wellness-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Wellness Product
                    </li>
                    <li
                      onClick={() => navigate("/jewellery-products")}
                      className="cursor-pointer hover:text-gray-800"
                    >
                      Jewellery Product
                    </li>
                  </ul>
                </div>
              </div>
            </li>

            <li
              onClick={() => navigate("/orders")}
              className="flex items-center gap-4 text-gray-700 font-bold text-sm hover:text-gray-900 cursor-pointer hover:bg-gray-200 px-2 py-2 rounded"
            >
              <IoBagCheckOutline size={20} />
              Orders
            </li>

            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("community")}
                className="flex items-center justify-between gap-2 hover:bg-gray-200 px-2 py-2 rounded w-full cursor-pointer"
              >
                <div className="flex items-center gap-4 text-gray-700 font-bold text-sm">
                  <FiUsers size={20} />
                  Community
                </div>
                {openAccordion === "community" ? (
                  <IoIosArrowUp />
                ) : (
                  <IoIosArrowDown />
                )}
              </button>
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  openAccordion === "community"
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white p-2 text-sky-600 shadow-sm">
                          <FiUsers size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-600">
                            Users
                          </p>
                          <p className="text-lg font-black text-slate-900">
                            {summary?.totalUsers ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white p-2 text-rose-600 shadow-sm">
                          <HiOutlineBuildingStorefront size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">
                            Vendors
                          </p>
                          <p className="text-lg font-black text-slate-900">
                            {summary?.totalVendors ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-4 text-red-500 font-bold text-sm hover:text-red-400 cursor-pointer hover:bg-gray-200 px-2 py-2 rounded"
            >
              <AiOutlineLogout size={20} />
              Logout
            </li>
          </ul>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative bg-white rounded-xl p-6 w-full max-w-md shadow-2xl z-10">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Confirm Logout
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutIsLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition flex items-center gap-2 disabled:bg-red-400 cursor-pointer"
              >
                {logoutIsLoading ? (
                  <>
                    <AuthButtonLoader color="#ffffff" size={16} />
                  </>
                ) : (
                  "Logout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
