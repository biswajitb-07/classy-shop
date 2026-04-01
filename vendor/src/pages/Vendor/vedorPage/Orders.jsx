import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaChevronRight,
  FaClipboardList,
  FaFilter,
  FaMapMarkerAlt,
  FaSearch,
  FaTruck,
} from "react-icons/fa";
import { FiClock, FiRefreshCcw } from "react-icons/fi";
import { useGetVendorOrdersQuery } from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { useTheme } from "../../../context/ThemeContext";
import { useVendorListingQueryState } from "../../../hooks/useVendorListingQueryState";
import { getVendorOrderPath } from "../../../utils/orderRouting";

const STATUS_FILTERS = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "processing", label: "Processing" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "returns", label: "Returns" },
  { key: "cancelled", label: "Cancelled" },
];

const formatStatus = (status) =>
  String(status || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatOrderDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

const getDestinationLine = (shippingAddress = {}) =>
  [
    shippingAddress.village || shippingAddress.city,
    shippingAddress.district,
    shippingAddress.state,
  ]
    .filter(Boolean)
    .join(", ");

const getStatusClasses = (status, isDark) => {
  if (String(status || "").startsWith("return")) {
    if (status === "return_completed") {
      return isDark
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (status === "return_rejected") {
      return isDark
        ? "bg-rose-500/15 text-rose-300 border-rose-400/20"
        : "bg-rose-50 text-rose-700 border-rose-200";
    }
    return isDark
      ? "bg-amber-500/15 text-amber-200 border-amber-400/20"
      : "bg-amber-50 text-amber-700 border-amber-200";
  }

  switch (status) {
    case "pending":
      return isDark
        ? "bg-yellow-500/15 text-yellow-200 border-yellow-400/20"
        : "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "processing":
      return isDark
        ? "bg-blue-500/15 text-blue-200 border-blue-400/20"
        : "bg-blue-50 text-blue-700 border-blue-200";
    case "shipped":
      return isDark
        ? "bg-violet-500/15 text-violet-200 border-violet-400/20"
        : "bg-violet-50 text-violet-700 border-violet-200";
    case "out_for_delivery":
      return isDark
        ? "bg-orange-500/15 text-orange-200 border-orange-400/20"
        : "bg-orange-50 text-orange-700 border-orange-200";
    case "delivered":
      return isDark
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/20"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "cancelled":
      return isDark
        ? "bg-rose-500/15 text-rose-300 border-rose-400/20"
        : "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return isDark
        ? "bg-slate-800 text-slate-200 border-slate-700"
        : "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const getStatusAccent = (status) => {
  if (String(status || "").startsWith("return")) {
    if (status === "return_completed") return "from-emerald-500 to-teal-500";
    if (status === "return_rejected") return "from-rose-500 to-red-500";
    return "from-amber-500 to-orange-500";
  }

  switch (status) {
    case "pending":
      return "from-yellow-500 to-amber-500";
    case "processing":
      return "from-blue-500 to-cyan-500";
    case "shipped":
      return "from-violet-500 to-fuchsia-500";
    case "out_for_delivery":
      return "from-cyan-500 to-sky-500";
    case "delivered":
      return "from-emerald-500 to-teal-500";
    case "cancelled":
      return "from-rose-500 to-red-500";
    default:
      return "from-slate-500 to-slate-400";
  }
};

const getOrderSteps = (orderStatus) => {
  if (orderStatus === "cancelled") {
    return [
      { label: "Placed", state: "done" },
      { label: "Cancelled", state: "active" },
    ];
  }

  if (String(orderStatus || "").startsWith("return")) {
    const sequence = [
      "delivered",
      "return_requested",
      "return_approved",
      "return_completed",
    ];
    const currentIndex = sequence.indexOf(orderStatus);

    return [
      { key: "delivered", label: "Delivered" },
      { key: "return_requested", label: "Requested" },
      { key: "return_approved", label: "Approved" },
      {
        key: orderStatus === "return_rejected" ? "return_rejected" : "return_completed",
        label: orderStatus === "return_rejected" ? "Rejected" : "Closed",
      },
    ].map((step, index) => ({
      label: step.label,
      state:
        orderStatus === "return_rejected" && step.key === "return_rejected"
          ? "active"
          : index < currentIndex
            ? "done"
            : index === currentIndex
              ? "active"
              : "pending",
    }));
  }

  const sequence = [
    "pending",
    "processing",
    "shipped",
    "out_for_delivery",
    "delivered",
  ];
  const currentIndex = sequence.indexOf(orderStatus);

  return [
    { label: "Placed" },
    { label: "Processing" },
    { label: "Shipped" },
    { label: "On route" },
    { label: "Delivered" },
  ].map((step, index) => ({
    label: step.label,
    state:
      index < currentIndex ? "done" : index === currentIndex ? "active" : "pending",
  }));
};

const Orders = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetVendorOrdersQuery();
  const { searchParams, updateQueryParams } = useVendorListingQueryState();

  const orders = ordersData?.orders || [];
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState(
    () => searchParams.get("status") || "all",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setActiveFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  useEffect(() => {
    updateQueryParams({
      q: searchTerm.trim() || null,
      status: activeFilter !== "all" ? activeFilter : null,
    });
  }, [activeFilter, searchTerm, updateQueryParams]);

  const pageClass = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_top,#101828_0%,#050816_58%,#02040b_100%)]"
    : "min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)]";

  const sectionCardClass = isDark
    ? "rounded-[2rem] border border-slate-800/90 bg-slate-950/70 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl"
    : "rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl";

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesQuery =
        !query ||
        order.orderId?.toLowerCase().includes(query) ||
        order.shippingAddress?.fullName?.toLowerCase().includes(query) ||
        order.shippingAddress?.city?.toLowerCase().includes(query) ||
        order.items?.some((item) =>
          String(item.productName || item.productType || "")
            .toLowerCase()
            .includes(query)
        );

      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "returns"
            ? String(order.orderStatus || "").startsWith("return")
            : order.orderStatus === activeFilter;

      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, orders, searchTerm]);

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) =>
        ["processing", "shipped", "out_for_delivery"].includes(order.orderStatus)
      ).length,
      pendingReturns: orders.filter((order) =>
        ["return_requested", "return_approved"].includes(order.orderStatus)
      ).length,
      totalRevenue,
    };
  }, [orders]);

  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isError) return <ErrorMessage onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className={`${pageClass} grid h-[26rem] place-items-center`}>
        <PageLoader message="Loading order workspace..." />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className={pageClass}>
        <div className="container mx-auto px-4 pb-12 pt-4">
          <div className={`${sectionCardClass} mx-auto max-w-2xl px-8 py-12 text-center`}>
            <div
              className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
                isDark ? "bg-slate-900 text-red-400" : "bg-red-50 text-red-500"
              }`}
            >
              <FaBoxOpen className="h-11 w-11" />
            </div>
            <h2 className={`mt-6 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              No orders in your workspace
            </h2>
            <p className={`mt-3 text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Jaise hi customers order place karenge, unka complete lifecycle yahan management view
              me dikhne lagega.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageClass}>
      <div className="container mx-auto px-4 pb-10 pt-4">
        <section className={`${sectionCardClass} relative overflow-hidden px-6 py-6 md:px-8`}>
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 h-40 ${
              isDark
                ? "bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_45%),radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_35%)]"
                : "bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.12),transparent_42%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_34%)]"
            }`}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                    isDark
                      ? "bg-gradient-to-br from-red-500 to-orange-500 text-white"
                      : "bg-gradient-to-br from-red-500 to-pink-500 text-white"
                  }`}
                >
                  <FaClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.26em] ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                    Order Management
                  </p>
                  <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${isDark ? "text-white" : "text-slate-900"}`}>
                    Vendor Orders Workspace
                  </h1>
                </div>
              </div>
              <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Track fulfilment, returns, delivery assignments, and customer destinations from one
                cleaner, higher-contrast operations view.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshOrders}
              disabled={isRefreshing}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
                isDark
                  ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              }`}
            >
              <FiRefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Orders"}
            </button>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Orders",
                value: stats.totalOrders,
                tone: isDark
                  ? "from-slate-900 to-slate-800 border-slate-800 text-white"
                  : "from-slate-50 to-white border-slate-200 text-slate-900",
                icon: <FaClipboardList className="h-5 w-5" />,
              },
              {
                label: "Active Fulfilment",
                value: stats.activeOrders,
                tone: isDark
                  ? "from-cyan-950/70 to-slate-900 border-cyan-900/60 text-cyan-100"
                  : "from-cyan-50 to-white border-cyan-200 text-cyan-900",
                icon: <FaTruck className="h-5 w-5" />,
              },
              {
                label: "Return Queue",
                value: stats.pendingReturns,
                tone: isDark
                  ? "from-amber-950/70 to-slate-900 border-amber-900/60 text-amber-100"
                  : "from-amber-50 to-white border-amber-200 text-amber-900",
                icon: <FiClock className="h-5 w-5" />,
              },
              {
                label: "Total GMV",
                value: formatCurrency(stats.totalRevenue),
                tone: isDark
                  ? "from-emerald-950/70 to-slate-900 border-emerald-900/60 text-emerald-100"
                  : "from-emerald-50 to-white border-emerald-200 text-emerald-900",
                icon: <FaBoxOpen className="h-5 w-5" />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.75rem] border bg-gradient-to-br px-5 py-5 ${card.tone}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">
                      {card.label}
                    </p>
                    <p className="mt-4 text-3xl font-bold">{card.value}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3">{card.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-8 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div
              className={`flex items-center gap-3 rounded-[1.4rem] border px-4 py-3 ${
                isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50"
              }`}
            >
              <FaSearch className={isDark ? "text-slate-500" : "text-slate-400"} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by order ID, customer, city, or product"
                className={`w-full bg-transparent text-sm outline-none ${
                  isDark ? "text-white placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-400"
                }`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                  isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-600"
                }`}
              >
                <FaFilter className="h-3.5 w-3.5" />
                Filter
              </div>
              {STATUS_FILTERS.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? isDark
                          ? "bg-white text-slate-950"
                          : "bg-slate-900 text-white"
                        : isDark
                          ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-5">
          {filteredOrders.length ? (
            filteredOrders.map((order) => {
              const steps = getOrderSteps(order.orderStatus);
              const doneCount = steps.filter(
                (step) => step.state === "done" || step.state === "active"
              ).length;
              const progressPercent =
                steps.length > 1 ? ((doneCount - 1) / (steps.length - 1)) * 100 : 0;
              const accent = getStatusAccent(order.orderStatus);
              const statusClasses = getStatusClasses(order.orderStatus, isDark);
              const customerName =
                order.shippingAddress?.fullName ||
                order.userId?.name ||
                "Customer";
              const productPreview = (order.items || [])
                .slice(0, 2)
                .map((item) => item.productName || item.productType)
                .filter(Boolean)
                .join(", ");
              const extraItems = Math.max((order.items || []).length - 2, 0);
              const destinationLine = getDestinationLine(order.shippingAddress);

              return (
                <article
                  key={order._id}
                  className={`${sectionCardClass} relative overflow-hidden px-6 py-6 md:px-7`}
                >
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r ${accent} opacity-10`}
                  />

                  <div className="relative flex flex-col gap-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-black/10`}
                          >
                            <FaBoxOpen className="h-5 w-5" />
                          </div>
                          <div>
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${
                                isDark ? "text-slate-500" : "text-slate-500"
                              }`}
                            >
                              Active Order
                            </p>
                            <h2
                              className={`mt-1 text-xl font-bold md:text-2xl ${
                                isDark ? "text-white" : "text-slate-900"
                              }`}
                            >
                              Order #{order.orderId}
                            </h2>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses}`}
                          >
                            {formatStatus(order.orderStatus)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {String(order.paymentMethod || "cod").toUpperCase()}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isDark
                                ? "bg-slate-900/80 text-slate-400 ring-1 ring-white/5"
                                : "bg-white text-slate-500 ring-1 ring-slate-200"
                            }`}
                          >
                            {order.items?.length || 0} item{(order.items?.length || 0) > 1 ? "s" : ""}
                          </span>
                        </div>

                        <div
                          className={`grid gap-3 sm:grid-cols-3 ${
                            isDark ? "text-slate-300" : "text-slate-700"
                          }`}
                        >
                          {[
                            { label: "Placed", value: formatOrderDate(order.createdAt) },
                            { label: "Customer", value: customerName },
                            { label: "Destination", value: destinationLine || "Address unavailable" },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className={`rounded-2xl border px-4 py-3 ${
                                isDark
                                  ? "border-slate-800 bg-slate-950/60"
                                  : "border-slate-200 bg-white/80"
                              }`}
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                                {item.label}
                              </p>
                              <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-start gap-3 xl:items-end">
                        <div
                          className={`rounded-[1.6rem] border px-4 py-4 text-left xl:max-w-[18rem] ${
                            isDark
                              ? "border-slate-800 bg-slate-950/80 text-slate-300"
                              : "border-slate-200 bg-white/90 text-slate-600"
                          }`}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                            Quick Snapshot
                          </p>
                          <p className={`mt-3 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {formatCurrency(order.totalAmount)}
                          </p>
                          <p className="mt-2 text-sm leading-6">
                            {productPreview || "Order items"}
                            {extraItems ? ` +${extraItems} more` : ""}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              getVendorOrderPath(order, {
                                search: searchParams.toString(),
                              }),
                            )
                          }
                          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                            isDark
                              ? "bg-white text-slate-950 hover:bg-slate-200"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          Open Details
                          <FaChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                      <div
                        className={`rounded-[1.8rem] border p-5 ${
                          isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50/80"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                              Fulfilment Flow
                            </p>
                            <p
                              className={`mt-2 text-sm ${
                                isDark ? "text-slate-400" : "text-slate-600"
                              }`}
                            >
                              {doneCount} of {steps.length} milestones cleared
                            </p>
                          </div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isDark ? "bg-slate-900 text-slate-300" : "bg-white text-slate-600"
                            }`}
                          >
                            {Math.round(Math.max(0, progressPercent))}% complete
                          </div>
                        </div>

                        <div className="mt-5">
                          <div
                            className={`relative h-2 overflow-hidden rounded-full ${
                              isDark ? "bg-slate-800" : "bg-slate-200"
                            }`}
                          >
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${accent}`}
                              style={{ width: `${Math.max(6, progressPercent)}%` }}
                            />
                          </div>

                          <div className="mt-6 grid gap-3 sm:grid-cols-5">
                            {steps.map((step, index) => (
                              <div
                                key={step.label}
                                className={`rounded-[1.4rem] border px-4 py-4 ${
                                  step.state === "done"
                                    ? isDark
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : step.state === "active"
                                      ? isDark
                                        ? "border-slate-700 bg-slate-900 text-white"
                                        : "border-slate-300 bg-white text-slate-900"
                                      : isDark
                                        ? "border-slate-800 bg-slate-950 text-slate-500"
                                        : "border-slate-200 bg-white text-slate-400"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                                    {step.state === "done"
                                      ? "Done"
                                      : step.state === "active"
                                        ? "Live"
                                        : "Queued"}
                                  </span>
                                  <span className="text-xs font-semibold opacity-70">
                                    {String(index + 1).padStart(2, "0")}
                                  </span>
                                </div>
                                <p className="mt-4 text-sm font-semibold leading-5">{step.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div
                          className={`rounded-[1.8rem] border p-5 ${
                            isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-white/90"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Revenue Desk
                              </p>
                              <p className={`mt-3 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                                {formatCurrency(order.totalAmount)}
                              </p>
                            </div>
                            <div
                              className={`rounded-2xl p-3 ${
                                isDark ? "bg-rose-500/10 text-rose-300" : "bg-rose-50 text-rose-500"
                              }`}
                            >
                              <FaClipboardList className="h-5 w-5" />
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-2 gap-3">
                            {[
                              { label: "Items", value: order.items?.length || 0 },
                              { label: "Payment", value: String(order.paymentMethod || "cod").toUpperCase() },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className={`rounded-2xl px-4 py-3 ${
                                  isDark ? "bg-slate-900 text-slate-200" : "bg-slate-50 text-slate-700"
                                }`}
                              >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  {item.label}
                                </p>
                                <p className="mt-2 text-lg font-bold">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          className={`rounded-[1.8rem] border p-5 ${
                            isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-white/90"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl ${
                                isDark ? "bg-slate-900 text-cyan-300" : "bg-cyan-50 text-cyan-600"
                              }`}
                            >
                              <FaMapMarkerAlt className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Delivery Destination
                              </p>
                              <p
                                className={`mt-3 text-base font-semibold leading-7 ${
                                  isDark ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {destinationLine || "Address unavailable"}
                              </p>
                              <p
                                className={`mt-3 text-sm leading-6 ${
                                  isDark ? "text-slate-400" : "text-slate-600"
                                }`}
                              >
                                {productPreview || "Order items"}
                                {extraItems ? ` +${extraItems} more` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className={`${sectionCardClass} px-6 py-10 text-center`}>
              <div
                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                  isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"
                }`}
              >
                <FaSearch className="h-6 w-6" />
              </div>
              <h3 className={`mt-5 text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                No orders match this view
              </h3>
              <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Search term ya status filter change karke dusre orders dekh sakte ho.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Orders;
