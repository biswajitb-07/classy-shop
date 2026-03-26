import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineMenu } from "react-icons/ai";
import { IoNotifications } from "react-icons/io5";
import { FiBell, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toggleSidebar } from "../../features/authSlice";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import {
  useClearVendorNotificationsMutation,
  useDeleteVendorNotificationMutation,
  useGetVendorNotificationsQuery,
} from "../../features/api/authApi";
import { connectVendorSocket } from "../../lib/socket";

const Header = () => {
  const { isOpen, vendor } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);
  const {
    data: notificationData,
    isFetching,
    refetch: refetchNotifications,
  } = useGetVendorNotificationsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [deleteVendorNotification, { isLoading: isDeletingNotification }] =
    useDeleteVendorNotificationMutation();
  const [clearVendorNotifications, { isLoading: isClearingNotifications }] =
    useClearVendorNotificationsMutation();

  const notifications = useMemo(
    () => notificationData?.notifications || [],
    [notificationData?.notifications]
  );

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
    if (!vendor?._id) return undefined;

    const socket = connectVendorSocket();
    const handleNotificationUpdate = () => {
      refetchNotifications();
    };

    socket.on("vendor:notifications:update", handleNotificationUpdate);

    return () => {
      socket.off("vendor:notifications:update", handleNotificationUpdate);
    };
  }, [refetchNotifications, vendor?._id]);

  const handleDeleteNotification = async (id) => {
    await deleteVendorNotification(id);
  };

  const handleClearNotifications = async () => {
    await clearVendorNotifications();
  };

  return (
    <div
      className={`fixed top-0 right-0 left-0 z-30 flex items-center justify-between px-4 py-4 sm:px-5 ${
        isDark ? "bg-[#111827] shadow-[0_12px_30px_rgba(0,0,0,0.35)]" : "bg-white shadow-md"
      } w-full`}
    >
      <div className="flex items-center gap-7">
        <AiOutlineMenu
          onClick={() => dispatch(toggleSidebar())}
          className={`text-2xl cursor-pointer ${isDark ? "text-slate-200" : "text-gray-700"}`}
        />
        {!isOpen && (
          <img
            src={isDark ? "/logo-dark.png" : "/logo-light.png"}
            alt="Logo"
            className="w-28 md:w-40"
          />
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setIsNotificationOpen((current) => !current)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
              isDark
                ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                : "bg-slate-100 text-gray-700 hover:bg-slate-200"
            }`}
          >
            <IoNotifications className="text-xl cursor-pointer" />
            {notifications.length > 0 ? (
              <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notifications.length}
              </span>
            ) : null}
          </button>

          {isNotificationOpen ? (
            <div
              className={`absolute right-0 mt-3 w-[22rem] overflow-hidden rounded-3xl border shadow-2xl ${
                isDark
                  ? "border-slate-700 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div
                className={`flex items-center justify-between gap-3 border-b px-4 py-4 ${
                  isDark ? "border-slate-800" : "border-slate-100"
                }`}
              >
                <div>
                  <p className="text-sm font-bold">Notifications</p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Instant order alerts for your products
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!notifications.length || isClearingNotifications}
                  onClick={handleClearNotifications}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    notifications.length
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : isDark
                      ? "bg-slate-800 text-slate-500"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-[24rem] overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`border-b px-4 py-4 transition ${
                        isDark
                          ? "border-slate-800 hover:bg-slate-900"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNotificationOpen(false);
                            if (notification.orderId) {
                              navigate(`/order/${notification.orderId}`);
                            }
                          }}
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
                            <FiBell className="text-sm" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {notification.title}
                            </p>
                            <p
                              className={`mt-1 text-xs leading-5 ${
                                isDark ? "text-slate-300" : "text-slate-600"
                              }`}
                            >
                              {notification.message}
                            </p>
                            <p
                              className={`mt-2 text-[11px] ${
                                isDark ? "text-slate-500" : "text-slate-400"
                              }`}
                            >
                              {new Date(notification.createdAt).toLocaleString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteNotification(notification._id)
                          }
                          disabled={isDeletingNotification}
                          className={`mt-1 rounded-full p-2 transition ${
                            isDark
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 text-white">
                      <FiBell className="text-lg" />
                    </div>
                    <p className="mt-4 text-sm font-bold">No notifications yet</p>
                    <p
                      className={`mt-1 text-xs ${
                        isDark ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      New customer orders will appear here automatically.
                    </p>
                  </div>
                )}
              </div>

              {isFetching ? (
                <div
                  className={`border-t px-4 py-2 text-center text-xs ${
                    isDark
                      ? "border-slate-800 text-slate-400"
                      : "border-slate-100 text-slate-500"
                  }`}
                >
                  Refreshing notifications...
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {vendor?.photoUrl ? (
          <>
            <img
              onClick={() => navigate("/profile")}
              src={vendor.photoUrl}
              alt=""
              className="w-9 h-9 cursor-pointer rounded-full"
            />
          </>
        ) : (
          <>
            <div
              onClick={() => navigate("/profile")}
              className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center text-sm font-semibold cursor-pointer"
            >
              {vendor.name.charAt(0).toUpperCase()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Header;
