import { useEffect, useState } from "react";
import { MdOutlineDashboard } from "react-icons/md";
import { TbBrandSnapchat, TbCategoryPlus } from "react-icons/tb";
import { RiProductHuntLine } from "react-icons/ri";
import { AiOutlineLogout, AiOutlineClose } from "react-icons/ai";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { IoBagCheckOutline } from "react-icons/io5";
import { FiUsers } from "react-icons/fi";
import { FiMail } from "react-icons/fi";
import { FiSettings } from "react-icons/fi";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { Headphones } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setSidebarOpen, toggleSidebar } from "../../features/authSlice";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  useGetDashboardSummaryQuery,
  useLogoutUserMutation,
} from "../../features/api/authApi";
import { toast } from "react-hot-toast";
import AuthButtonLoader from "../../component/Loader/AuthButtonLoader";
import { connectVendorSocket } from "../../lib/socket";

const Sidebar = () => {
  const { isOpen } = useSelector((store) => store.auth);
  const [openAccordion, setOpenAccordion] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isDark, resetTheme } = useTheme();

  const [logoutUser, { isLoading: logoutIsLoading }] = useLogoutUserMutation();
  const { data: summaryData, refetch: refetchSummary } = useGetDashboardSummaryQuery();
  const summary = summaryData?.summary;

  useEffect(() => {
    const socket = connectVendorSocket();
    const handleSummaryUpdate = () => {
      refetchSummary();
    };

    socket.on("connect", handleSummaryUpdate);
    socket.on("vendor:summary:update", handleSummaryUpdate);

    return () => {
      socket.off("connect", handleSummaryUpdate);
      socket.off("vendor:summary:update", handleSummaryUpdate);
    };
  }, [refetchSummary]);

  const toggleAccordion = (key) => {
    setOpenAccordion(openAccordion === key ? null : key);
  };

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false));
  };

  const navigateTo = (path) => {
    navigate(path);
    closeSidebar();
  };

  const isActivePath = (...paths) => paths.includes(location.pathname);
  const activeItemClass = (active) =>
    active
      ? "bg-black text-white shadow-md"
      : isDark
        ? "bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
        : "text-gray-700 hover:text-gray-900 hover:bg-gray-200";
  const activeSubItemClass = (active) =>
    active
      ? "bg-black text-white border border-black shadow-sm"
      : isDark
        ? "border border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:border-slate-700 hover:text-white"
        : "border-sky-100 bg-sky-50 hover:bg-sky-100";
  const communityCardClass = (active, kind) => {
    if (active) return "bg-black text-white border-black";
    if (isDark) {
      return kind === "users"
        ? "border-slate-700 bg-slate-900/80 hover:bg-slate-800"
        : "border-slate-700 bg-slate-900/80 hover:bg-slate-800";
    }
    return kind === "users"
      ? "border-sky-100 bg-sky-50 hover:bg-sky-100"
      : "border-rose-100 bg-rose-50 hover:bg-rose-100";
  };
  const communityCardTextClass = (active, kind) => {
    if (active) return "text-white/80";
    if (isDark) return kind === "users" ? "text-sky-300" : "text-rose-300";
    return kind === "users" ? "text-sky-600" : "text-rose-600";
  };
  const communityValueClass = (active) =>
    active ? "text-white" : isDark ? "text-slate-100" : "text-slate-900";

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      resetTheme();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (err) {
      toast.error(err?.data?.message || "Logout failed");
    }
  };

  return (
    <>
      <div
        className={`vendor-sidebar-scrollbar fixed top-0 left-0 z-50 h-screen w-[18rem] overflow-y-auto transform-gpu transition-transform duration-300 ease-out will-change-transform ${
          isDark
            ? "bg-[linear-gradient(180deg,#050816_0%,#0f172a_50%,#111827_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
            : "bg-white shadow-md"
        } ${
          isOpen ? "translate-x-0 px-5 py-5" : "-translate-x-full px-5 py-5"
        }`}
      >
        <div
          className={`flex flex-col justify-center gap-8 transition-opacity duration-300 ${
            !isOpen && "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between">
            <img
              src={isDark ? "/logo-dark.png" : "/logo-light.png"}
              alt="logo"
              className="w-28 md:w-40"
            />
            <AiOutlineClose
              onClick={closeSidebar}
              size={23}
              className="cursor-pointer transition hover:rotate-90 bg-red-500 text-white lg:hidden"
            />
          </div>

          <ul className="flex flex-col gap-4">
            <li
              onClick={() => navigateTo("/")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/"
              )}`}
            >
              <MdOutlineDashboard size={20} />
              Dashboard
            </li>

            {/* Category */}
            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("category")}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-2 transition cursor-pointer ${activeItemClass(
                  isActivePath("/category", "/category-list")
                )}`}
              >
                <div className="flex items-center gap-4 text-sm font-bold">
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
                  <ul className={`ml-16 mt-2 mb-2 flex flex-col gap-4 text-sm font-semibold list-disc ${isDark ? "text-slate-200" : "text-gray-600"}`}>
                    <li
                      onClick={() => navigateTo("/category-list")}
                      className={`cursor-pointer rounded px-2 py-1 transition ${activeSubItemClass(
                        location.pathname === "/category-list"
                      )}`}
                    >
                      Category List
                    </li>
                    <li
                      onClick={() => navigateTo("/category")}
                      className={`cursor-pointer rounded px-2 py-1 transition ${activeSubItemClass(
                        location.pathname === "/category"
                      )}`}
                    >
                      Add Category
                    </li>
                  </ul>
                </div>
              </div>
            </li>

            <li
              onClick={() => navigateTo("/brands")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                isActivePath(
                  "/brands",
                  "/fashion-brand-list",
                  "/electronic-brand-list",
                  "/bag-brand-list",
                  "/grocery-brand-list",
                  "/footwear-brand-list",
                  "/beauty-brand-list",
                  "/wellness-brand-list",
                  "/jewellery-brand-list"
                )
              )}`}
            >
              <TbBrandSnapchat size={20} />
              Brands Hub
            </li>

            <li
              onClick={() => navigateTo("/products")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                isActivePath(
                  "/products",
                  "/fashion-products",
                  "/electronic-products",
                  "/bag-products",
                  "/grocery-products",
                  "/footwear-products",
                  "/beauty-products",
                  "/wellness-products",
                  "/jewellery-products"
                )
              )}`}
            >
              <RiProductHuntLine size={20} />
              Products Hub
            </li>

            <li
              onClick={() => navigateTo("/orders")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/orders"
              )}`}
            >
              <IoBagCheckOutline size={20} />
              Orders
            </li>

            <li
              onClick={() => navigateTo("/support-chats")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/support-chats"
              )}`}
            >
              <Headphones size={18} />
              Support Chats
            </li>

            <li
              onClick={() => navigateTo("/site-content")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/site-content"
              )}`}
            >
              <ImageIcon size={18} />
              Site Content
            </li>

            <li
              onClick={() => navigateTo("/settings")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/settings"
              )}`}
            >
              <FiSettings size={20} />
              Settings
            </li>

            <li className="flex flex-col">
              <button
                onClick={() => toggleAccordion("community")}
                className={`flex w-full items-center justify-between gap-2 rounded px-2 py-2 transition cursor-pointer ${activeItemClass(
                  isActivePath(
                    "/community/users",
                    "/community/vendors",
                    "/community/newsletter"
                  )
                )}`}
              >
                <div className="flex items-center gap-4 text-sm font-bold">
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
                    <div 
                      onClick={() => navigateTo("/community/users")}
                      className={`rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${communityCardClass(
                        location.pathname === "/community/users",
                        "users"
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2 shadow-sm bg-white ${location.pathname === "/community/users" ? "text-black" : isDark ? "text-slate-200" : "text-sky-600"}`}>
                          <FiUsers size={18} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${communityCardTextClass(location.pathname === "/community/users", "users")}`}>
                            Users
                          </p>
                          <p className={`text-lg font-black ${communityValueClass(location.pathname === "/community/users")}`}>
                            {summary?.totalUsers ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => navigateTo("/community/vendors")}
                      className={`rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${communityCardClass(
                        location.pathname === "/community/vendors",
                        "vendors"
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2 shadow-sm bg-white ${location.pathname === "/community/vendors" ? "text-black" : isDark ? "text-slate-200" : "text-rose-600"}`}>
                          <HiOutlineBuildingStorefront size={18} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${communityCardTextClass(location.pathname === "/community/vendors", "vendors")}`}>
                            Vendors
                          </p>
                          <p className={`text-lg font-black ${communityValueClass(location.pathname === "/community/vendors")}`}>
                            {summary?.totalVendors ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div 
                      onClick={() => navigateTo("/community/newsletter")}
                      className={`rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${communityCardClass(
                        location.pathname === "/community/newsletter",
                        "users"
                      )}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`rounded-xl p-2 shadow-sm bg-white ${location.pathname === "/community/newsletter" ? "text-black" : isDark ? "text-slate-200" : "text-violet-600"}`}>
                          <FiMail size={18} />
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${communityCardTextClass(location.pathname === "/community/newsletter", "users")}`}>
                            Newsletter
                          </p>
                          <p className={`text-lg font-black ${communityValueClass(location.pathname === "/community/newsletter")}`}>
                            List
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>

            <li
              onClick={() => {
                closeSidebar();
                setShowLogoutConfirm(true);
              }}
              className={`flex items-center gap-4 font-bold text-sm cursor-pointer px-2 py-2 rounded transition ${isDark ? "text-rose-300 hover:text-rose-200 hover:bg-slate-800" : "text-red-500 hover:text-red-400 hover:bg-gray-200"}`}
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
          <div className={`relative rounded-xl p-6 w-full max-w-md shadow-2xl z-10 ${isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}`}>
            <h3 className="text-lg font-semibold mb-4">
              Confirm Logout
            </h3>
            <p className={`mb-6 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              Are you sure you want to log out?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`px-4 py-2 rounded-xl transition cursor-pointer ${isDark ? "bg-slate-800 text-slate-100 hover:bg-slate-700" : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
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
