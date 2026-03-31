import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Bell,
  Bike,
  Home,
  LogOut,
  Menu,
  PackageSearch,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  authApi,
  useClearDeliveryNotificationsMutation,
  useDeleteDeliveryNotificationMutation,
  useGetDeliveryNotificationsQuery,
  useLogoutUserMutation,
  useToggleAvailabilityMutation,
} from "../features/api/authApi";
import { orderApi } from "../features/api/orderApi";
import { setSidebarOpen, toggleSidebar } from "../features/authSlice";
import AuthButtonLoader from "../component/Loader/AuthButtonLoader";
import { disconnectDeliverySocket, getDeliverySocket } from "../lib/socket";

const navigationItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: Home,
  },
  {
    label: "Assigned Orders",
    path: "/orders",
    icon: PackageSearch,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: UserCircle2,
  },
];

const formatNotificationTime = (value) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatPresenceTime = (value) => {
  if (!value) return "just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MainLayout = () => {
  const { deliveryPartner, isOpen } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);
  const [hasAppliedDesktopDefault, setHasAppliedDesktopDefault] = useState(false);
  const [logoutUser, { isLoading: isLoggingOut }] = useLogoutUserMutation();
  const [toggleAvailability, { isLoading: isUpdatingAvailability }] =
    useToggleAvailabilityMutation();
  const [deleteDeliveryNotification] = useDeleteDeliveryNotificationMutation();
  const [clearDeliveryNotifications, { isLoading: isClearingNotifications }] =
    useClearDeliveryNotificationsMutation();
  const {
    data: notificationData,
    isFetching: isNotificationRefreshing,
    refetch: refetchNotifications,
  } = useGetDeliveryNotificationsQuery(undefined, {
    skip: !deliveryPartner?._id,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const notifications = useMemo(
    () => notificationData?.notifications || [],
    [notificationData?.notifications]
  );

  useEffect(() => {
    if (isOpen) {
      setShowOverlay(true);
      return undefined;
    }

    const timeout = setTimeout(() => setShowOverlay(false), 300);
    return () => clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (hasAppliedDesktopDefault) return;

    if (window.innerWidth >= 1024) {
      dispatch(setSidebarOpen(true));
    }

    setHasAppliedDesktopDefault(true);
  }, [dispatch, hasAppliedDesktopDefault]);

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
    if (!deliveryPartner?._id) return undefined;

    const socket = getDeliverySocket();
    socket.connect();

    const handleAssignment = (payload) => {
      toast.success(payload?.message || "A new delivery assignment arrived.");
      refetchNotifications();
      dispatch(orderApi.util.invalidateTags([{ type: "Order", id: "LIST" }]));
      dispatch(
        authApi.util.invalidateTags([
          { type: "DeliverySummary", id: "HOME" },
          { type: "DeliveryProfile", id: "ME" },
          { type: "DeliveryNotifications", id: "LIST" },
        ])
      );
    };

    const handleNotificationUpdate = () => {
      refetchNotifications();
      dispatch(
        authApi.util.invalidateTags([
          { type: "DeliveryNotifications", id: "LIST" },
        ])
      );
    };

    const handleDashboardUpdate = () => {
      dispatch(
        orderApi.util.invalidateTags([{ type: "Order", id: "LIST" }])
      );
      dispatch(
        authApi.util.invalidateTags([
          { type: "DeliverySummary", id: "HOME" },
          { type: "DeliveryProfile", id: "ME" },
        ])
      );
    };

    socket.on("delivery:assignment", handleAssignment);
    socket.on("delivery:notifications:update", handleNotificationUpdate);
    socket.on("delivery:dashboard:update", handleDashboardUpdate);

    return () => {
      socket.off("delivery:assignment", handleAssignment);
      socket.off("delivery:notifications:update", handleNotificationUpdate);
      socket.off("delivery:dashboard:update", handleDashboardUpdate);
      disconnectDeliverySocket();
    };
  }, [deliveryPartner?._id, dispatch, refetchNotifications]);

  const closeSidebar = () => {
    dispatch(setSidebarOpen(false));
  };

  const handleNavigate = () => {
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      disconnectDeliverySocket();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error(error?.data?.message || "Logout failed");
    }
  };

  const handleToggleAvailability = async () => {
    try {
      await toggleAvailability(!deliveryPartner?.isAvailable).unwrap();
      toast.success(
        deliveryPartner?.isAvailable
          ? "You are now offline for deliveries."
          : "You are now available for deliveries."
      );
    } catch (error) {
      toast.error(error?.data?.message || "Availability update failed");
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!id || deletingNotificationId || isClearingNotifications) return;
    setDeletingNotificationId(id);

    try {
      await deleteDeliveryNotification(id).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || "Notification delete failed");
    } finally {
      setDeletingNotificationId(null);
    }
  };

  const handleClearNotifications = async () => {
    if (!notifications.length || isClearingNotifications) return;

    try {
      await clearDeliveryNotifications().unwrap();
      setIsNotificationOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || "Notifications clear failed");
    }
  };

  const handleOpenNotification = (notification) => {
    setIsNotificationOpen(false);
    if (notification?.orderId) {
      navigate(`/orders/${notification.orderId}`);
    }
  };

  const pageTitle =
    navigationItems.find((item) =>
      item.path === "/"
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path)
    )?.label || "Delivery Dashboard";
  const isOnline = Boolean(deliveryPartner?.isOnline);
  const isAvailable = Boolean(deliveryPartner?.isAvailable);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950 text-slate-100">
      <aside
        className={`vendor-sidebar-scrollbar fixed top-0 left-0 z-50 flex h-screen w-[18rem] flex-col overflow-y-auto border-r border-slate-800 bg-[linear-gradient(180deg,#050816_0%,#0f172a_48%,#111827_100%)] px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative pr-14">
          <button
            type="button"
            onClick={closeSidebar}
            className="absolute right-0 top-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-cyan-400 via-indigo-500 to-violet-600 text-white shadow-[0_18px_40px_rgba(79,70,229,0.35)]">
              <Bike size={24} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.3em] text-slate-400 sm:text-xs">
                Classy Shop
              </p>
              <p className="mt-1 text-[2rem] font-black leading-none text-white sm:text-[2.1rem]">
                Delivery Hub
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-[2rem] border border-slate-800 bg-slate-950/70 p-5">
          <p className="text-2xl font-bold text-white">
            {deliveryPartner?.name || "Delivery Partner"}
          </p>
          <p className="mt-2 text-sm capitalize text-slate-400">
            {deliveryPartner?.vehicleType || "bike"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                isOnline
                  ? "bg-cyan-500/15 text-cyan-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {isOnline ? "Live Session" : "Disconnected"}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                isAvailable
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/15 text-amber-200"
              }`}
            >
              {isAvailable ? "Accepting Orders" : "Offline for Orders"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Last seen {formatPresenceTime(deliveryPartner?.lastSeenAt)}
          </p>
          <button
            type="button"
            onClick={handleToggleAvailability}
            disabled={isUpdatingAvailability}
            className={`mt-5 inline-flex min-h-[3.25rem] w-full items-center justify-center rounded-[1.3rem] px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-80 ${
              isAvailable
                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {isUpdatingAvailability ? (
              <AuthButtonLoader />
            ) : isAvailable ? (
              "Go offline for new orders"
            ) : (
              "Go online for new orders"
            )}
          </button>
        </section>

        <nav className="mt-10 flex flex-1 flex-col gap-3">
          {navigationItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={handleNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-[1.35rem] px-5 py-4 text-base font-semibold transition ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_16px_32px_rgba(79,70,229,0.3)]"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-8 inline-flex min-h-[3.7rem] items-center justify-center gap-3 rounded-[1.45rem] border border-slate-700 bg-transparent px-5 text-lg font-bold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-80"
        >
          {isLoggingOut ? <AuthButtonLoader /> : <LogOut size={20} />}
          {isLoggingOut ? "Logging out..." : "Logout"}
        </button>
      </aside>

      {showOverlay ? (
        <div
          className={`fixed inset-0 z-40 bg-black transition-opacity duration-300 ${
            isOpen ? "opacity-45" : "pointer-events-none opacity-0"
          }`}
          onClick={closeSidebar}
        />
      ) : null}

      <div className="h-full overflow-y-auto">
        <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur sm:px-5 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <button
                type="button"
                onClick={() => dispatch(toggleSidebar())}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
                aria-label="Toggle menu"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="truncate text-xs uppercase tracking-[0.45em] text-slate-500">
                  Delivery Dashboard
                </p>
                <h1 className="truncate text-2xl font-bold text-white">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto">
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen((current) => !current)}
                  className="relative inline-flex min-h-[3rem] items-center gap-3 rounded-full border border-slate-800 bg-slate-900 px-4 text-slate-100 transition hover:border-slate-700 hover:bg-slate-800"
                >
                  <Bell size={18} />
                  <span className="text-base font-medium">Notifications</span>
                  {notifications.length ? (
                    <span className="absolute -top-1 -right-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                      {notifications.length}
                    </span>
                  ) : null}
                </button>

                {isNotificationOpen ? (
                  <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4">
                      <div>
                        <p className="text-sm font-bold text-white">Notifications</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Saved delivery assignment alerts
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        disabled={!notifications.length || isClearingNotifications}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          notifications.length
                            ? "bg-rose-500 text-white hover:bg-rose-600"
                            : "bg-slate-900 text-slate-500"
                        }`}
                      >
                        {isClearingNotifications ? (
                          <span className="inline-flex min-w-[4rem] justify-center">
                            <AuthButtonLoader size={16} />
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
                            className="border-b border-slate-800 px-4 py-4 transition hover:bg-slate-900"
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => handleOpenNotification(notification)}
                                className="flex min-w-0 flex-1 items-start gap-3 text-left"
                              >
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                                  <Bell size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-white">
                                    {notification.title}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-slate-300">
                                    {notification.message}
                                  </p>
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    {formatNotificationTime(notification.createdAt)}
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteNotification(notification._id)
                                }
                                disabled={
                                  !!deletingNotificationId || isClearingNotifications
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
                                aria-label="Delete notification"
                              >
                                {deletingNotificationId === notification._id ? (
                                  <AuthButtonLoader size={14} />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-10 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-white">
                            <Bell size={18} />
                          </div>
                          <p className="mt-4 text-sm font-bold text-white">
                            No notifications yet
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            New assigned orders will be saved here automatically.
                          </p>
                        </div>
                      )}
                    </div>

                    {isNotificationRefreshing ? (
                      <div className="border-t border-slate-800 px-4 py-2 text-center text-xs text-slate-400">
                        Refreshing notifications...
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <Link
                to="/profile"
                className="inline-flex min-h-[3rem] max-w-full items-center rounded-full border border-slate-800 bg-slate-900 px-4 text-base font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-800"
              >
                <span className="truncate">{deliveryPartner?.email || "Delivery profile"}</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-5 lg:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
