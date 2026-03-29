import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import { LuMenu } from "react-icons/lu";
import { IoCartOutline, IoNotifications } from "react-icons/io5";
import { FaBagShopping } from "react-icons/fa6";
import { FiBell, FiTrash2 } from "react-icons/fi";
import { FiSettings } from "react-icons/fi";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetCartQuery,
  useGetWishlistQuery,
} from "../../features/api/cartApi";
import {
  useClearUserNotificationsMutation,
  useDeleteUserNotificationMutation,
  useGetUserNotificationsQuery,
} from "../../features/api/orderApi";
import Search from "../Search";
import Navigation from "./Navigation";
import CartPanel from "../shipping/CartPanel";
import { useTheme } from "../../context/ThemeContext";
import AuthButtonLoader from "../Loader/AuthButtonLoader.jsx";
import { connectUserSocket } from "../../lib/socket.js";
import {
  playNotificationSound,
  primeUiFeedbackSounds,
  waitForNextPaint,
} from "../../utils/uiFeedbackSounds.js";

const Header = ({ visible, openCategoryPanel, isOpenCatPanel, categories }) => {
  const [isOpenCartPanel, setIsOpenCartPanel] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);
  const notificationRef = useRef(null);

  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useSelector((store) => store.auth);
  const { data: cartData } = useGetCartQuery(undefined, {
    skip: !user,
  });
  const { data: wishlistData } = useGetWishlistQuery(undefined, {
    skip: !user,
  });
  const { data: notificationData, refetch: refetchNotifications } =
    useGetUserNotificationsQuery(undefined, {
      skip: !user,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    });
  const [deleteUserNotification] = useDeleteUserNotificationMutation();
  const [clearUserNotifications, { isLoading: isClearingNotifications }] =
    useClearUserNotificationsMutation();

  const cartCount = cartData?.cart?.length || 0;
  const wishlistCount = wishlistData?.wishlist?.length || 0;
  const notifications = useMemo(
    () => notificationData?.notifications || [],
    [notificationData?.notifications]
  );

  const openCartPanel = () => {
    setIsOpenCartPanel(!isOpenCartPanel);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    primeUiFeedbackSounds();
  }, []);

  useEffect(() => {
    if (!user?._id) return undefined;

    const socket = connectUserSocket();
    const handleNotificationUpdate = async () => {
      await refetchNotifications();
      await waitForNextPaint();
      playNotificationSound();
    };

    socket.on("user:notifications:update", handleNotificationUpdate);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("user:notifications:update", handleNotificationUpdate);
    };
  }, [refetchNotifications, user?._id]);

  const handleDeleteNotification = async (notificationId) => {
    if (!notificationId || deletingNotificationId) return;
    setDeletingNotificationId(notificationId);
    try {
      await deleteUserNotification(notificationId).unwrap();
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const handleClearNotifications = async () => {
    if (!notifications.length || isClearingNotifications) return;
    await clearUserNotifications().unwrap();
  };

  return (
    <>
      <header
        className={`bg-white fixed top-0 z-30 w-full shadow-xs shadow-red-500/20 transition-transform duration-700 ease-in-out ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {/* first navbar */}
        <div className="top-strip py-2 border-[#eadddd] border-t-[1px] border-b-[1px] hidden lg:block">
          <div className="container">
            <div className="flex items-center justify-between">
              <div className="col1 w-[50%]">
                <p className="text-[12px] font-[500]">
                  Get up to 50% off new season styles, limited time only
                </p>
              </div>

              <div className="col2 flex items-center justify-end">
                <ul className="flex items-center gap-4 list-none">
                  <li>
                    <Link
                      to="/support"
                      className="text-[13px] link font-[500] transition duration-150 ease-linear"
                    >
                      Help Center
                    </Link>
                  </li>
                  {user && (
                    <li className="relative" ref={notificationRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setIsNotificationOpen((current) => !current)
                        }
                        className="relative flex items-center gap-2 text-[13px] font-[600] text-gray-700 hover:text-red-500 transition duration-150 ease-linear"
                      >
                        <IoNotifications className="w-4 h-4" />
                        <span>Notifications</span>
                        {notifications.length ? (
                          <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold">
                            {notifications.length}
                          </span>
                        ) : null}
                      </button>

                      {isNotificationOpen ? (
                        <div className="absolute right-0 mt-4 w-[22rem] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl z-50">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
                            <div>
                              <p className="text-sm font-bold">Notifications</p>
                              <p className="text-xs text-slate-500">
                                Order status updates from vendors
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={
                                !notifications.length || isClearingNotifications
                              }
                              onClick={handleClearNotifications}
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                notifications.length
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              {isClearingNotifications ? (
                                <span className="flex min-w-[3.5rem] justify-center">
                                  <AuthButtonLoader />
                                </span>
                              ) : (
                                "Clear all"
                              )}
                            </button>
                          </div>

                          <div className="max-h-[24rem] overflow-y-auto">
                            {notifications.length ? (
                              notifications.map((notification) => (
                                <div
                                  key={notification._id}
                                  className="border-b border-slate-100 px-4 py-4 hover:bg-slate-50 transition"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsNotificationOpen(false);
                                        if (notification.orderId) {
                                          navigate(
                                            `/order/${notification.orderId}`
                                          );
                                        }
                                      }}
                                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                                    >
                                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 text-white">
                                        <FiBell className="text-sm" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-bold">
                                          {notification.title}
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                          {notification.message}
                                        </p>
                                        <p className="mt-2 text-[11px] text-slate-400">
                                          {new Date(
                                            notification.createdAt
                                          ).toLocaleString("en-IN", {
                                            day: "2-digit",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </p>
                                      </div>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteNotification(
                                          notification._id
                                        )
                                      }
                                      disabled={
                                        !!deletingNotificationId ||
                                        isClearingNotifications
                                      }
                                      className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {deletingNotificationId ===
                                      notification._id ? (
                                        <AuthButtonLoader />
                                      ) : (
                                        <FiTrash2 className="text-sm" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-10 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 text-white">
                                  <FiBell className="text-lg" />
                                </div>
                                <p className="mt-4 text-sm font-bold">
                                  No notifications yet
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Vendor order updates will appear here.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* second navbar */}
        <div className="header py-4 border-[#eadddd] border-t-[1px] border-b-[1px]">
          <div className="container flex items-center justify-between">
            <div
              onClick={openCategoryPanel}
              className="lg:hidden text-xl md:text-3xl cursor-pointer hover:text-red-500 transition duration-100 ease-linear"
            >
              <LuMenu />
            </div>

            <div className="col1 lg:w-[25%]">
              <Link>
                <img
                  className="w-36 md:w-44 lg:w-48"
                  src={isDark ? "/logo-dark.png" : "/logo-light.png"}
                />
              </Link>
            </div>

            <div className="col2 hidden lg:block w-[45%]">
              <Search />
            </div>

            {/* for mobile and tablet */}
            <div
              className="lg:hidden relative text-2xl md:text-3xl cursor-pointer hover:text-red-500 transition duration-100 ease-linear"
              onClick={openCartPanel}
            >
              <IoCartOutline />
              <span className="absolute -bottom-1 -left-1 md:-left-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                {cartCount}
              </span>
            </div>

            <div className="col3 w-[30%] hidden lg:flex items-center">
              <ul className="w-full flex items-center justify-end gap-3">
                {!user && (
                  <li className="list-none flex items-center gap-2 pl-3">
                    <Link
                      to="/login"
                      className="px-4 py-2 bg-gradient-to-r from-[#e47a7a] to-[#df3636] text-white text-[15px] font-bold rounded-full hover:from-[#e05a5a] hover:to-[#c72a2a] hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      Login
                    </Link>
                    <span className="text-gray-400">|</span>
                    <Link
                      to="/login"
                      className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-[15px] font-bold rounded-full hover:from-gray-600 hover:to-gray-700 hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      Register
                    </Link>
                  </li>
                )}

                {user && (
                  <li
                    onClick={() => navigate("/profile")}
                    className="cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                  >
                    {user?.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.name || "User Profile"}
                        className="w-8 h-8 text-gray-600 hover:scale-105 transition-colors duration-200 ease-in-out rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center bg-red-600 text-white hover:text-white transition-colors duration-200 ease-in-out rounded-full text-lg font-semibold">
                        {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                    )}
                    <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                      Profile
                    </div>
                  </li>
                )}

                <li
                  onClick={() => navigate("/orders")}
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                >
                  <FaBagShopping className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors duration-200" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Orders
                  </div>
                </li>

                {/* Heart Icon */}
                <li
                  onClick={() => navigate("/product-wishlist")}
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                >
                  <Heart className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors duration-200" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                    {wishlistCount}
                  </span>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Wishlist
                  </div>
                </li>

                {/* Shopping Cart */}
                <li
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                  onClick={openCartPanel}
                >
                  <ShoppingCart className="w-5 h-5 text-gray-600 hover:text-blue-500 transition-colors duration-200" />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold hover:bg-red-600 transition-colors duration-200">
                    {cartCount}
                  </span>
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Cart
                  </div>
                </li>

                <li
                  onClick={() => navigate("/settings")}
                  className="relative cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200 ease-in-out group"
                >
                  <FiSettings className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors duration-200" />
                  <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-[#ff5252] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                    Settings
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* third navbar */}
        <div className="lg:py-4">
          <Navigation
            openCategoryPanel={openCategoryPanel}
            isOpenCatPanel={isOpenCatPanel}
            categories={categories}
          />
        </div>
      </header>
      <CartPanel
        categories={categories}
        openCartPanel={openCartPanel}
        isOpenCartPanel={isOpenCartPanel}
      />
    </>
  );
};

export default Header;
