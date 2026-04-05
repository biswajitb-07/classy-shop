import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaBoxOpen, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useGetUserOrdersQuery } from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import { useTheme } from "../../../context/ThemeContext.jsx";

const ITEMS_PER_PAGE = 6;

const parsePositivePage = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const OrderListPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetUserOrdersQuery();
  const orders = ordersData?.orders || [];
  const { isDark } = useTheme();

  const [isAnimated, setIsAnimated] = useState(false);
  const rawPage = parsePositivePage(searchParams.get("page"));
  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(rawPage, totalPages);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== rawPage) {
      const next = new URLSearchParams(searchParams);
      if (currentPage <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(currentPage));
      }
      setSearchParams(next, { replace: true });
    }
  }, [currentPage, rawPage, searchParams, setSearchParams]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, orders]);

  if (isError) return <ErrorMessage onRetry={refetch} />;

  if (isLoading) {
    return <PageLoader message="Loading your orders..." />;
  }

  if (!orders.length) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-[#050816]" : "bg-gradient-to-br from-gray-50 to-gray-100"}`}>
        <div className="container mx-auto px-4">
          <div className={`max-w-md mx-auto text-center rounded-2xl shadow-xl p-8 ${isDark ? "bg-slate-900 text-white" : "bg-white text-slate-900"}`}>
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isDark ? "bg-slate-800" : "bg-gradient-to-r from-red-100 to-pink-100"}`}>
              <FaBoxOpen className="w-12 h-12 text-red-500" />
            </div>
            <h2 className={`text-2xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-800"}`}>
              No Orders Yet
            </h2>
            <p className={`mb-8 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              Start shopping to place your first order!
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    if (status.startsWith("return")) {
      if (status === "return_rejected") return "bg-red-500 text-white";
      if (status === "return_approved") return "bg-orange-500 text-white";
      if (status === "return_completed") return "bg-green-500 text-white";
      return "bg-yellow-500 text-white";
    }
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "processing":
        return "bg-blue-500 text-white";
      case "shipped":
        return "bg-purple-500 text-white";
      case "out_for_delivery":
        return "bg-orange-500 text-white";
      case "delivered":
        return "bg-green-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getBgColor = (status) => {
    if (status.startsWith("return")) {
      if (status === "return_rejected") return "bg-red-500";
      if (status === "return_approved") return "bg-orange-500";
      if (status === "return_completed") return "bg-green-500";
      return "bg-yellow-500";
    }
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "out_for_delivery":
        return "bg-orange-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getThemeColor = (status) => {
    const bgClass = getBgColor(status);
    const match = bgClass.match(/bg-([a-z-]+)-500/);
    if (!match) {
      return { bg: bgClass, fillBg: bgClass };
    }
    return {
      bg: bgClass,
      fillBg: `bg-${match[1]}-500`,
    };
  };

  const getOrderSteps = (orderStatus) => {
    if (orderStatus === "cancelled") {
      return [
        { label: "Order Placed", status: "completed" },
        { label: "Cancelled", status: "current" },
      ];
    }

    if (orderStatus.startsWith("return")) {
      const steps = [
        { label: "Order Placed", status: "completed" },
        { label: "Delivered", status: "completed" },
        {
          label: "Return Requested",
          status: orderStatus === "return_requested" ? "current" : "completed",
        },
      ];

      if (orderStatus === "return_rejected") {
        steps.push({ label: "Return Rejected", status: "current" });
      } else if (
        orderStatus === "return_approved" ||
        orderStatus === "return_completed"
      ) {
        steps.push({
          label: "Return Approved",
          status: orderStatus === "return_approved" ? "current" : "completed",
        });
        if (orderStatus === "return_completed") {
          steps.push({ label: "Return Completed", status: "current" });
        }
      }
      return steps;
    }

    const allSteps = [
      { key: "pending", label: "Order Placed" },
      { key: "processing", label: "Processing" },
      { key: "shipped", label: "Shipped" },
      { key: "out_for_delivery", label: "Out for Delivery" },
      { key: "delivered", label: "Delivered" },
    ];
    const statusOrder = ["pending", "processing", "shipped", "out_for_delivery", "delivered"];
    const currentIndex = statusOrder.indexOf(orderStatus);

    return allSteps.map((step, index) => ({
      label: step.label,
      status:
        index < currentIndex
          ? "completed"
          : index === currentIndex
            ? "current"
            : "pending",
    }));
  };

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    setSearchParams(next, { replace: true });
  };

  const showingFrom = orders.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, orders.length);

  return (
    <div className={`min-h-screen pb-[2rem] ${isDark ? "bg-[#050816] text-white" : "bg-gradient-to-br from-gray-50 to-gray-100 text-slate-900"}`}>
      <div className="container">
        <div className="mb-8">
          <h1 className={`text-lg md:text-2xl font-bold flex items-center gap-3 ${isDark ? "text-white" : "text-gray-800"}`}>
            <FaBoxOpen className="text-red-500" />
            My Orders
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mt-2"></div>
        </div>

        <div className="space-y-6">
          {paginatedOrders.map((order) => {
            const steps = getOrderSteps(order.orderStatus);
            const theme = getThemeColor(order.orderStatus);
            const completedCount = steps.filter(
              (s) => s.status === "completed" || s.status === "current",
            ).length;
            const progressWidth =
              steps.length > 1
                ? `calc((100% - 2rem) * ${completedCount / steps.length})`
                : "0%";

            return (
              <div
                key={order._id}
                className={`rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-300 ${isDark ? "bg-slate-900 border border-slate-700" : "bg-white"}`}
                onClick={() => navigate(`/order/${order._id}`)}
              >
                <div className="flex justify-between items-center mb-6 gap-4">
                  <div>
                    <h3 className={`font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                      Order #{order.orderId}
                    </h3>
                    <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {order.orderStatus.charAt(0).toUpperCase() +
                      order.orderStatus.slice(1).replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mb-6 px-2">
                  <div className="flex items-center justify-between relative">
                    <div
                      className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"
                      style={{
                        left: "1rem",
                        right: "1rem",
                        width: "calc(100% - 2rem)",
                      }}
                    ></div>

                    <div
                      className={`absolute top-4 left-0 h-0.5 transition-all duration-700 ease-out ${
                        theme.bg
                      } transform origin-left scale-x-0 ${
                        isAnimated ? "scale-x-100" : ""
                      }`}
                      style={{
                        left: "1rem",
                        width: progressWidth,
                      }}
                    ></div>

                    {steps.map((step, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center relative z-10"
                        style={{ flex: 1 }}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-in-out transform ${
                            step.status === "completed"
                              ? "bg-green-500 border-green-500 scale-110"
                              : step.status === "current"
                                ? `${theme.fillBg} scale-105 border-transparent`
                                : "bg-white border-gray-300 scale-100"
                          } ${isAnimated ? "opacity-100" : "opacity-0"}`}
                          style={{
                            transitionDelay: `${index * 100}ms`,
                          }}
                        >
                          {(step.status === "completed" || step.status === "current") && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-xs mt-2 text-center max-w-[80px] transition-opacity duration-500 ${
                            step.status === "pending"
                              ? "text-gray-400"
                              : isDark
                                ? "text-slate-200 font-medium"
                                : "text-gray-700 font-medium"
                          } ${isAnimated ? "opacity-100" : "opacity-0"}`}
                          style={{
                            transitionDelay: `${(steps.length - index) * 100}ms`,
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className={`${isDark ? "text-slate-300" : "text-gray-600"} text-sm`}>Items</p>
                    <p className="font-medium">{order.items.length}</p>
                  </div>
                  <div>
                    <p className={`${isDark ? "text-slate-300" : "text-gray-600"} text-sm`}>Total</p>
                    <p className="font-medium text-red-500">
                      ₹{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-red-500 font-bold">Payment - </p>
                    {order.paymentMethod === "razorpay" ? (
                      <div>
                        <img
                          src="./razorpay-icon.png"
                          alt="razorpay"
                          className="w-16 md:w-28"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <img
                          src="./cod-icon.png"
                          alt="cod"
                          className="w-10 md:w-16"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`${isDark ? "text-slate-300" : "text-gray-600"} text-sm`}>Shipping</p>
                    <p className={`font-medium ${isDark ? "text-white" : ""}`}>
                      {order.shippingAddress.city}, {order.shippingAddress.district}, {order.shippingAddress.state}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button className="flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors duration-200">
                    View Details <FaChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {orders.length > ITEMS_PER_PAGE ? (
          <section className={`mt-8 rounded-2xl px-5 py-4 ${isDark ? "border border-slate-800 bg-slate-900/70" : "border border-slate-200 bg-white shadow-sm"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Showing {showingFrom}-{showingTo} of {orders.length} orders
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
                          ? "bg-red-500 text-slate-950 shadow-sm"
                          : "bg-red-500 text-white shadow-sm"
                        : isDark
                          ? "border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-red-100"
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
                    isDark
                      ? "border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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

export default OrderListPage;
