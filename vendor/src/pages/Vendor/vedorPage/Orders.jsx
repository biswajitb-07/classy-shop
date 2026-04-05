import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaChevronLeft,
  FaChevronRight,
  FaClipboardList,
  FaFilter,
  FaMapMarkerAlt,
  FaSearch,
} from "react-icons/fa";
import { FiRefreshCcw } from "react-icons/fi";
import { useGetVendorOrdersQuery } from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { useTheme } from "../../../context/ThemeContext";
import { useVendorListingQueryState } from "../../../hooks/useVendorListingQueryState";
import { getVendorOrderPath } from "../../../utils/orderRouting";

const ITEMS_PER_PAGE = 6;

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

const parsePositivePage = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

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
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (status === "return_rejected") {
      return isDark
        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
        : "border-rose-200 bg-rose-50 text-rose-700";
    }
    return isDark
      ? "border-amber-500/20 bg-amber-500/10 text-amber-200"
      : "border-amber-200 bg-amber-50 text-amber-700";
  }

  switch (status) {
    case "pending":
      return isDark
        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-200"
        : "border-yellow-200 bg-yellow-50 text-yellow-700";
    case "processing":
      return isDark
        ? "border-blue-500/20 bg-blue-500/10 text-blue-200"
        : "border-blue-200 bg-blue-50 text-blue-700";
    case "shipped":
      return isDark
        ? "border-violet-500/20 bg-violet-500/10 text-violet-200"
        : "border-violet-200 bg-violet-50 text-violet-700";
    case "out_for_delivery":
      return isDark
        ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-200"
        : "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "delivered":
      return isDark
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return isDark
        ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
        : "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return isDark
        ? "border-slate-700 bg-slate-900 text-slate-300"
        : "border-slate-200 bg-slate-100 text-slate-700";
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

  const sequence = ["pending", "processing", "shipped", "out_for_delivery", "delivered"];
  const currentIndex = sequence.indexOf(orderStatus);

  return ["Placed", "Processing", "Shipped", "On route", "Delivered"].map(
    (label, index) => ({
      label,
      state: index < currentIndex ? "done" : index === currentIndex ? "active" : "pending",
    }),
  );
};

const Orders = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { data: ordersData, isLoading, isError, refetch } = useGetVendorOrdersQuery();
  const { searchParams, updateQueryParams } = useVendorListingQueryState();

  const orders = ordersData?.orders || [];
  const queryPage = parsePositivePage(searchParams.get("page"));
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") || "");
  const [activeFilter, setActiveFilter] = useState(() => searchParams.get("status") || "all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSearchTerm(searchParams.get("q") || "");
    setActiveFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const pageClass = isDark
    ? "min-h-screen bg-[radial-gradient(circle_at_top,#101828_0%,#050816_58%,#02040b_100%)]"
    : "min-h-screen bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_55%,#eef2ff_100%)]";

  const surfaceClass = isDark
    ? "rounded-[1.75rem] border border-slate-800/90 bg-slate-950/70 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl"
    : "rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl";

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
            .includes(query),
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
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter((order) =>
        ["processing", "shipped", "out_for_delivery"].includes(order.orderStatus),
      ).length,
      pendingReturns: orders.filter((order) =>
        ["return_requested", "return_approved"].includes(order.orderStatus),
      ).length,
      totalRevenue,
    };
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(queryPage, totalPages);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== queryPage) {
      updateQueryParams({ page: currentPage > 1 ? currentPage : null });
    }
  }, [currentPage, queryPage, updateQueryParams]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredOrders]);

  const handleRefreshOrders = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    updateQueryParams({
      q: value.trim() || null,
      status: activeFilter !== "all" ? activeFilter : null,
      page: null,
    });
  };

  const handleFilterChange = (value) => {
    setActiveFilter(value);
    updateQueryParams({
      q: searchTerm.trim() || null,
      status: value !== "all" ? value : null,
      page: null,
    });
  };

  const handlePageChange = (page) => {
    updateQueryParams({ page: page > 1 ? page : null });
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
          <div className={`${surfaceClass} mx-auto max-w-2xl px-8 py-12 text-center`}>
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
              Jaise hi customers order place karenge, unka lifecycle yahan clean order queue me dikhne lagega.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const showingFrom = filteredOrders.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length);

  return (
    <div className={pageClass}>
      <div className="container mx-auto px-4 pb-10 pt-4">
        <section className={`${surfaceClass} px-6 py-6 md:px-8`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                    isDark ? "bg-slate-900 text-white" : "bg-slate-900 text-white"
                  }`}
                >
                  <FaClipboardList className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Order Management
                  </p>
                  <h1 className={`mt-1 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                    Orders Workspace
                  </h1>
                </div>
              </div>
              <p className={`mt-4 max-w-2xl text-sm leading-7 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Saare customer orders, fulfilment progress, returns aur delivery destinations ek cleaner operations view me.
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

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Orders", value: stats.totalOrders },
              { label: "Active Orders", value: stats.activeOrders },
              { label: "Return Queue", value: stats.pendingReturns },
              { label: "Total Revenue", value: formatCurrency(stats.totalRevenue) },
            ].map((card) => (
              <div
                key={card.label}
                className={`rounded-[1.35rem] border px-4 py-4 ${
                  isDark ? "border-slate-800 bg-slate-950/70" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {card.label}
                </p>
                <p className={`mt-3 text-2xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div
              className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 ${
                isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50"
              }`}
            >
              <FaSearch className={isDark ? "text-slate-500" : "text-slate-400"} />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => handleSearchChange(event.target.value)}
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
                    onClick={() => handleFilterChange(filter.key)}
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

        <section className="mt-6 space-y-4">
          {paginatedOrders.length ? (
            paginatedOrders.map((order) => {
              const steps = getOrderSteps(order.orderStatus);
              const doneCount = steps.filter((step) => step.state === "done" || step.state === "active").length;
              const progressPercent = steps.length > 1 ? ((doneCount - 1) / (steps.length - 1)) * 100 : 0;
              const statusClasses = getStatusClasses(order.orderStatus, isDark);
              const customerName = order.shippingAddress?.fullName || order.userId?.name || "Customer";
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
                  className={`${surfaceClass} px-5 py-5 md:px-6`}
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className={`text-xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          Order #{order.orderId}
                        </h2>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses}`}>
                          {formatStatus(order.orderStatus)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-slate-900 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
                          {String(order.paymentMethod || "cod").toUpperCase()}
                        </span>
                      </div>

                      <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                        {[
                          { label: "Placed", value: formatOrderDate(order.createdAt) },
                          { label: "Customer", value: customerName },
                          { label: "Destination", value: destinationLine || "Address unavailable" },
                          { label: "Items", value: `${order.items?.length || 0} item${(order.items?.length || 0) > 1 ? "s" : ""}` },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className={`rounded-2xl border px-4 py-3 ${
                              isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-white/80"
                            }`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                              {item.label}
                            </p>
                            <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className={`rounded-[1.35rem] border px-4 py-4 ${isDark ? "border-slate-800 bg-slate-950/60" : "border-slate-200 bg-slate-50/80"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                              Fulfilment Progress
                            </p>
                            <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                              {doneCount} of {steps.length} milestones cleared
                            </p>
                          </div>
                          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-slate-900 text-slate-300" : "bg-white text-slate-600"}`}>
                            {Math.round(Math.max(0, progressPercent))}% complete
                          </div>
                        </div>

                        <div className={`mt-4 h-2 overflow-hidden rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                          <div
                            className={`h-full rounded-full ${isDark ? "bg-cyan-400" : "bg-slate-900"}`}
                            style={{ width: `${Math.max(6, progressPercent)}%` }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {steps.map((step) => (
                            <span
                              key={step.label}
                              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                                step.state === "done"
                                  ? isDark
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-emerald-50 text-emerald-700"
                                  : step.state === "active"
                                    ? isDark
                                      ? "bg-white text-slate-950"
                                      : "bg-slate-900 text-white"
                                    : isDark
                                      ? "bg-slate-900 text-slate-500"
                                      : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {step.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="xl:w-[18rem] shrink-0">
                      <div className={`rounded-[1.35rem] border px-4 py-4 ${isDark ? "border-slate-800 bg-slate-950/80 text-slate-300" : "border-slate-200 bg-white/90 text-slate-600"}`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Order Summary
                        </p>
                        <p className={`mt-3 text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                          {formatCurrency(order.totalAmount)}
                        </p>
                        <p className="mt-3 text-sm leading-6">
                          {productPreview || "Order items"}
                          {extraItems ? ` +${extraItems} more` : ""}
                        </p>
                        <div className={`mt-4 rounded-2xl px-4 py-3 ${isDark ? "bg-slate-900 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Delivery Destination
                          </p>
                          <p className="mt-2 flex items-start gap-2 text-sm font-medium leading-6">
                            <FaMapMarkerAlt className="mt-1 shrink-0" />
                            <span>{destinationLine || "Address unavailable"}</span>
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
                          className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
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
                  </div>
                </article>
              );
            })
          ) : (
            <div className={`${surfaceClass} px-6 py-10 text-center`}>
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isDark ? "bg-slate-900 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
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

        {filteredOrders.length > ITEMS_PER_PAGE ? (
          <section className={`${surfaceClass} mt-6 px-5 py-4`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Showing {showingFrom}-{showingTo} of {filteredOrders.length} orders
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDark ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <FaChevronLeft className="h-3 w-3" />
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                      page === currentPage
                        ? isDark
                          ? "bg-blue-700 text-slate-950"
                          : "bg-black text-white"
                        : isDark
                          ? "bg-slate-900 text-slate-300 hover:bg-slate-800"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDark ? "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Next
                  <FaChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default Orders;
