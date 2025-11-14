import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBoxOpen, FaChevronRight } from "react-icons/fa";
import { useGetUserOrdersQuery } from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";

const OrderListPage = () => {
  const navigate = useNavigate();
  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetUserOrdersQuery();
  const orders = ordersData?.orders || [];

  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Trigger animation after a short delay for smooth entrance
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isError) return <ErrorMessage onRetry={refetch} />;

  if (isLoading) {
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <PageLoader message="Loading your orders..." />
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
              <FaBoxOpen className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              No Orders Yet
            </h2>
            <p className="text-gray-600 mb-8">
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
      return { bg: bgClass, border: "", text: "", dot: "", ring: "" };
    }
    const colorName = match[1];
    return {
      bg: bgClass,
      border: `border-${colorName}-500`,
      text: `text-${colorName}-500`,
      dot: `bg-${colorName}-500`,
      ring: `ring-${colorName}-100`,
      fillBg: `bg-${colorName}-500`, // Added for current step filled bg
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

    // Normal flow
    const allSteps = [
      { key: "pending", label: "Order Placed" },
      { key: "processing", label: "Processing" },
      { key: "shipped", label: "Shipped" },
      { key: "delivered", label: "Delivered" },
    ];
    const statusOrder = ["pending", "processing", "shipped", "delivered"];
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-[2rem]">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-lg md:text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FaBoxOpen className="text-red-500" />
            My Orders
          </h1>
          <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mt-2"></div>
        </div>
        <div className="space-y-6">
          {orders.map((order) => {
            const steps = getOrderSteps(order.orderStatus);
            const theme = getThemeColor(order.orderStatus);

            // Calculate progress including completed + current for full bar on final states
            const completedCount = steps.filter(
              (s) => s.status === "completed" || s.status === "current"
            ).length;
            const progressWidth =
              steps.length > 1
                ? `calc((100% - 2rem) * ${completedCount / steps.length})`
                : "0%";

            return (
              <div
                key={order._id}
                className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-shadow duration-300"
                onClick={() => navigate(`/order/${order._id}`)}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      Order #{order.orderId}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus
                    )}`}
                  >
                    {order.orderStatus.charAt(0).toUpperCase() +
                      order.orderStatus.slice(1).replace(/_/g, " ")}
                  </span>
                </div>

                {/* Progress Bar with Animation */}
                <div className="mb-6 px-2">
                  <div className="flex items-center justify-between relative">
                    {/* Static gray background line */}
                    <div
                      className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200"
                      style={{
                        left: "1rem",
                        right: "1rem",
                        width: "calc(100% - 2rem)",
                      }}
                    ></div>

                    {/* Animated progress line - starts at 0%, animates to calculated width */}
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

                    {/* Step indicators with staggered animation */}
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
                              ? `${theme.fillBg} border-${theme.bg
                                  .split("-")[1]
                                  .replace("bg-", "")}-500 scale-105` // Filled bg for current
                              : "bg-white border-gray-300 scale-100"
                          } ${isAnimated ? "opacity-100" : "opacity-0"}`}
                          style={{
                            transitionDelay: `${index * 100}ms`, // Staggered entrance
                          }}
                        >
                          {step.status === "completed" && (
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
                          {step.status === "current" && (
                            <svg
                              className="w-4 h-4 text-white" // White tick on filled bg
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
                              : "text-gray-700 font-medium"
                          } ${isAnimated ? "opacity-100" : "opacity-0"}`}
                          style={{
                            transitionDelay: `${
                              (steps.length - index) * 100
                            }ms`, // Reverse stagger for labels
                          }}
                        >
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Details Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Items</p>
                    <p className="font-medium">{order.items.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="font-medium text-red-500">
                      ₹{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-red-600 font-bold">Payment - </p>
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
                    <p className="text-sm text-gray-600">Shipping</p>
                    <p className="font-medium">
                      {order.shippingAddress.city},{" "}
                      {order.shippingAddress.district},{" "}
                      {order.shippingAddress.state}
                    </p>
                  </div>
                </div>

                {/* View Details Button */}
                <div className="flex justify-end">
                  <button className="flex items-center gap-2 text-red-500 hover:text-red-600 font-medium transition-colors duration-200">
                    View Details <FaChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderListPage;
