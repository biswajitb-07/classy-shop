import { useEffect, useState } from "react";
import { MdOutlineDashboard } from "react-icons/md";
import { RiProductHuntLine } from "react-icons/ri";
import { AiOutlineLogout, AiOutlineClose } from "react-icons/ai";
import { IoBagCheckOutline } from "react-icons/io5";
import { FiSettings } from "react-icons/fi";
import { FiCreditCard } from "react-icons/fi";
import { Headphones } from "lucide-react";
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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isDark, resetTheme } = useTheme();

  const [logoutUser, { isLoading: logoutIsLoading }] = useLogoutUserMutation();
  const { refetch: refetchSummary } = useGetDashboardSummaryQuery();

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
            <div>
              <img
                src={isDark ? "/logo-dark.png" : "/logo-light.png"}
                alt="logo"
                className="w-28 md:w-40"
              />
              <p className={`mt-2 text-[11px] font-bold uppercase tracking-[0.26em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Vendor Workspace
              </p>
            </div>
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
              Admin Support
            </li>

            <li
              onClick={() => navigateTo("/payouts")}
              className={`flex items-center gap-4 rounded px-2 py-2 text-sm font-bold transition cursor-pointer ${activeItemClass(
                location.pathname === "/payouts"
              )}`}
            >
              <FiCreditCard size={18} />
              Payouts
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
