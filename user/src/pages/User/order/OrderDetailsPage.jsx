import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaBoxOpen,
  FaCreditCard,
  FaHistory,
  FaMapMarkerAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetUserOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../../../features/api/orderApi.js";
import PageLoader from "../../../components/Loader/PageLoader.jsx";
import ErrorMessage from "../../../components/error/ErrorMessage.jsx";
import ConfirmDialog from "../../../components/ConfirmDialog.jsx";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";
import { useTheme } from "../../../context/ThemeContext.jsx";

const STATUS_LABELS = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  return_approved: "Return Approved",
  return_rejected: "Return Rejected",
  return_completed: "Return Completed",
  completed: "Completed",
  failed: "Failed",
  refund: "Refund In Progress",
};

const STATUS_SEQUENCE = [
  "pending",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const getStatusLabel = (status) => {
  if (!status) return "Unknown";
  return (
    STATUS_LABELS[status] ||
    String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const getStatusColor = (status) => {
  if (!status) return "bg-gray-500 text-white";

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
    case "completed":
      return "bg-green-500 text-white";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500 text-white";
    case "return_requested":
      return "bg-yellow-500 text-white";
    case "return_approved":
      return "bg-orange-500 text-white";
    case "return_completed":
    case "refund":
      return "bg-emerald-600 text-white";
    default:
      return "bg-gray-500 text-white";
  }
};

const getTimelineDotColor = (status) => {
  if (!status) return "bg-gray-400";

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
    case "completed":
      return "bg-green-500";
    case "cancelled":
    case "failed":
    case "return_rejected":
      return "bg-red-500";
    case "return_requested":
      return "bg-amber-500";
    case "return_approved":
      return "bg-orange-500";
    case "return_completed":
    case "refund":
      return "bg-emerald-600";
    default:
      return "bg-slate-400";
  }
};

const formatTimelineActor = (role) => {
  switch (role) {
    case "user":
      return "Customer";
    case "vendor":
      return "Vendor";
    case "system":
      return "System";
    default:
      return "Update";
  }
};

const formatTimelineTime = (value) => {
  if (!value) return "Time unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getInitialStatusGuess = (order) => {
  if (!order) return "pending";
  return order.paymentMethod === "razorpay" ? "processing" : "pending";
};

const getInitialStatusReason = (order, status) => {
  if (status === "processing" && order?.paymentMethod === "razorpay") {
    return "Payment confirmed via Razorpay";
  }

  if (status === "pending" && order?.paymentMethod === "cod") {
    return "Order placed with Cash on Delivery";
  }

  return "Order tracking started";
};

const buildTimelineEntries = (order) => {
  if (!order) return [];

  const history = [...(order.statusHistory || [])]
    .filter((entry) => entry?.to)
    .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
    .map((entry) => ({
      ...entry,
      synthetic: false,
    }));

  const entries = [...history];
  const hasExplicitInitialEntry = entries.some((entry) => !entry.from);
  const initialStatus = getInitialStatusGuess(order);

  if (!hasExplicitInitialEntry) {
    entries.unshift({
      from: "",
      to: initialStatus,
      role: "system",
      reason: getInitialStatusReason(order, initialStatus),
      at: order.createdAt,
      synthetic: true,
    });
  }

  const firstRealEntry = history[0];
  if (
    firstRealEntry?.from &&
    firstRealEntry.from !== initialStatus &&
    !entries.some(
      (entry) => entry.synthetic && entry.to === firstRealEntry.from,
    )
  ) {
    entries.splice(1, 0, {
      from: initialStatus,
      to: firstRealEntry.from,
      role: "system",
      reason: "Earlier order milestones were not fully tracked yet.",
      at: firstRealEntry.at || order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  const latestTrackedStatus = entries[entries.length - 1]?.to;
  if (latestTrackedStatus !== order.orderStatus) {
    entries.push({
      from: latestTrackedStatus || "",
      to: order.orderStatus,
      role: "system",
      reason: "Current status synced from the order record.",
      at: order.updatedAt || order.createdAt,
      synthetic: true,
    });
  }

  return entries;
};

const OrderTimelineCard = ({
  entries,
  headingText,
  bodyText,
  mutedText,
  surface,
  lineColor,
}) => (
  <div className={`${surface} rounded-2xl shadow-md p-6`}>
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <FaHistory className="text-red-500" />
      </div>
      <div>
        <h2 className={`text-xl font-bold ${headingText}`}>Tracking Timeline</h2>
        <p className={`text-sm ${mutedText}`}>
          Every order update appears here with time and reason.
        </p>
      </div>
    </div>

    <div className="space-y-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        return (
          <div key={`${entry.to}_${entry.at || index}_${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`w-4 h-4 rounded-full ring-4 ring-white dark:ring-slate-900 ${getTimelineDotColor(
                  entry.to,
                )}`}
              />
              {!isLast ? <div className={`w-px flex-1 min-h-14 ${lineColor}`} /> : null}
            </div>

            <div className={isLast ? "pb-0" : "pb-6"}>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    entry.to,
                  )}`}
                >
                  {getStatusLabel(entry.to)}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    lineColor.includes("slate")
                      ? "bg-slate-800 text-slate-200"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {formatTimelineActor(entry.role)}
                </span>
              </div>

              <p className={`mt-2 text-sm ${mutedText}`}>
                {formatTimelineTime(entry.at)}
              </p>

              {entry.reason ? (
                <p className={`mt-2 text-sm ${bodyText}`}>{entry.reason}</p>
              ) : null}

              {entry.from ? (
                <p className={`mt-1 text-xs ${mutedText}`}>
                  Changed from {getStatusLabel(entry.from)}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetUserOrdersQuery();

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState({
    type: null,
    title: "",
    description: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const pageBg = isDark
    ? "bg-slate-950"
    : "bg-gradient-to-br from-gray-50 to-gray-100";
  const surface = isDark
    ? "bg-slate-900 border border-slate-700"
    : "bg-white";
  const headingText = isDark ? "text-white" : "text-gray-800";
  const bodyText = isDark ? "text-slate-300" : "text-gray-600";
  const mutedText = isDark ? "text-slate-400" : "text-gray-500";
  const tableHeadBg = isDark
    ? "bg-slate-800 border-b border-slate-700"
    : "bg-gray-50 border-b border-gray-200";
  const tableRowHover = isDark ? "hover:bg-slate-800/70" : "hover:bg-gray-50";
  const tableDivide = isDark ? "divide-slate-700" : "divide-gray-100";
  const progressTrack = isDark ? "bg-slate-700" : "bg-green-200";
  const summaryRule = isDark ? "border-slate-700" : "border-gray-200";
  const timelineLine = isDark ? "bg-slate-700" : "bg-gray-200";

  const orders = ordersData?.orders || [];
  const order = orders.find((item) => item._id === orderId);

  const getVariantDisplay = (productType, variant) => {
    if (!variant || variant === "default") return null;

    if (productType === "Fashion" || productType === "Footwear") {
      const [key, value] = variant.split(":");
      if (key === "size" && value) return `Size: ${value}`;
      return variant.replace(":", ": ");
    }

    if (productType === "Electronics") {
      const pairs = variant.split("|").map((pair) => pair.split(":"));
      const ram = pairs.find(([key]) => key === "ram")?.[1];
      const storage = pairs.find(([key]) => key === "storage")?.[1];
      const parts = [];

      if (ram) parts.push(`RAM: ${ram}`);
      if (storage) parts.push(`Storage: ${storage}`);

      return parts.length ? parts.join(", ") : variant;
    }

    return variant;
  };

  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (isLoading) {
    return <PageLoader message="Loading order details..." />;
  }

  if (!order) {
    return (
      <div className={`min-h-screen ${pageBg}`}>
        <div className="container mx-auto px-4 py-16">
          <div
            className={`max-w-md mx-auto text-center ${surface} rounded-2xl shadow-xl p-8`}
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center dark:from-red-950 dark:to-pink-950">
              <FaBoxOpen className="w-12 h-12 text-red-500" />
            </div>
            <h2 className={`text-2xl font-bold ${headingText} mb-4`}>
              Order Not Found
            </h2>
            <p className={`${bodyText} mb-8`}>
              The order you are looking for does not exist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce((total, item) => total + item.quantity, 0);
  const timelineEntries = buildTimelineEntries(order);
  const isReturnFlow = order.orderStatus?.startsWith("return");
  const isCancelled = order.orderStatus === "cancelled";
  const canUserCancel = ["pending", "processing"].includes(order.orderStatus);
  const canUserRequestReturn = order.orderStatus === "delivered";

  const progressForStatus = (status) => {
    if (!status) return 0;
    if (status === "cancelled") return 0;

    if (status.startsWith("return")) {
      if (status === "return_requested") return 50;
      if (status === "return_approved") return 75;
      if (status === "return_completed") return 100;
      if (status === "return_rejected") return 50;
      return 50;
    }

    const idx = STATUS_SEQUENCE.indexOf(status);
    return idx >= 0 ? ((idx + 1) / STATUS_SEQUENCE.length) * 100 : 0;
  };

  const progressPercentage = progressForStatus(order.orderStatus);

  const openCancelDialog = () => {
    setConfirmMeta({
      type: "cancel",
      title: "Cancel Order",
      description:
        "Are you sure you want to cancel this order? This action cannot be undone.",
    });
    setConfirmOpen(true);
  };

  const openReturnDialog = () => {
    setConfirmMeta({
      type: "return",
      title: "Request Return",
      description:
        "Request return for this delivered order? Vendor will review the request.",
    });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (!confirmMeta.type) return;

    const payload =
      confirmMeta.type === "cancel"
        ? { status: "cancelled", reason: "Cancelled by user" }
        : { status: "return_requested", reason: "Return requested by user" };

    try {
      await updateOrderStatus({ orderId: order._id, body: payload }).unwrap();
      toast.success(
        confirmMeta.type === "cancel"
          ? "Order cancelled successfully"
          : "Return requested successfully",
      );
      await refetch();
    } catch (error) {
      const message =
        error?.data?.message || error?.message || "Something went wrong";
      toast.error(message);
    }
  };

  return (
    <div className={`min-h-screen ${pageBg} pb-16`}>
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mt-8 mb-6">
          <h1
            className={`text-xl md:text-2xl font-bold ${headingText} flex items-center gap-2`}
          >
            <FaBoxOpen className="text-red-500" />
            Order Details #{order.orderId}
          </h1>
        </div>

        <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <div className={`${surface} rounded-2xl shadow-md overflow-hidden p-6`}>
              <div className="mb-6">
                <div className="relative mb-2 h-6">
                  <div
                    className={`absolute top-1/2 left-0 w-full h-1 ${progressTrack} rounded-full transform -translate-y-1/2`}
                  />
                  <div
                    className={`absolute top-1/2 left-0 h-1 rounded-full transform -translate-y-1/2 transition-all duration-700 ease-in-out ${
                      isReturnFlow
                        ? "bg-orange-500"
                        : isCancelled
                          ? "bg-red-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center gap-3">
                  <div className={`text-sm ${bodyText}`}>Current status</div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {getStatusLabel(order.orderStatus)}
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className={tableHeadBg}>
                    <tr>
                      <th
                        className={`px-6 py-4 text-left font-semibold ${bodyText} uppercase`}
                      >
                        Product
                      </th>
                      <th
                        className={`px-6 py-4 text-left font-semibold ${bodyText} uppercase`}
                      >
                        Variant
                      </th>
                      <th
                        className={`px-6 py-4 text-center font-semibold ${bodyText} uppercase`}
                      >
                        Qty
                      </th>
                      <th
                        className={`px-6 py-4 text-right font-semibold ${bodyText} uppercase`}
                      >
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${tableDivide}`}>
                    {order.items.map((item, index) => (
                      <tr
                        key={`${item.productId}_${index}`}
                        className={tableRowHover}
                      >
                        <td className="px-6 py-4">
                          <div
                            onClick={() =>
                              navigate(
                                `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                                  item.product._id
                                }`,
                              )
                            }
                            className="flex items-center gap-4 cursor-pointer group"
                          >
                            <img
                              src={item.product.image?.[0] || "/fallback-image.jpg"}
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition"
                            />
                            <div>
                              <h4
                                className={`font-semibold ${headingText} group-hover:text-red-500`}
                              >
                                {item.product.name}
                              </h4>
                              <p className={`text-xs ${mutedText} mt-1`}>
                                {item.productType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getVariantDisplay(item.productType, item.variant) || (
                            <span className={`${mutedText} text-sm`}>Default</span>
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-center font-bold ${headingText}`}
                        >
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-red-500 font-bold">
                            ₹{item.subtotal.toLocaleString()}
                          </p>
                          <p className={`text-sm ${mutedText}`}>
                            ₹{item.price.toLocaleString()} each
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`md:hidden divide-y ${tableDivide}`}>
                {order.items.map((item, index) => (
                  <div
                    key={`${item.productId}_${index}`}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div
                      onClick={() =>
                        navigate(
                          `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                            item.product._id
                          }`,
                        )
                      }
                      className="flex gap-4 items-center group cursor-pointer"
                    >
                      <img
                        src={item.product.image?.[0] || "/fallback-image.jpg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition"
                      />
                      <div>
                        <h4
                          className={`font-semibold ${headingText} group-hover:text-red-500`}
                        >
                          {item.product.name}
                        </h4>
                        <p className={`text-xs ${mutedText}`}>{item.productType}</p>
                        {getVariantDisplay(item.productType, item.variant) ? (
                          <p
                            className={`text-xs ${
                              isDark ? "text-cyan-300" : "text-blue-600"
                            }`}
                          >
                            {getVariantDisplay(item.productType, item.variant)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm ${bodyText}`}>Qty: {item.quantity}</p>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">
                          ₹{item.subtotal.toLocaleString()}
                        </p>
                        <p className={`text-xs ${mutedText}`}>
                          ₹{item.price.toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <OrderTimelineCard
              entries={timelineEntries}
              headingText={headingText}
              bodyText={bodyText}
              mutedText={mutedText}
              surface={surface}
              lineColor={timelineLine}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2 className={`text-xl font-bold ${headingText} mb-4`}>
                Order Summary
              </h2>
              <div className={`space-y-3 ${bodyText} text-sm`}>
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Update</span>
                  <span>{formatTimelineTime(order.updatedAt || order.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <hr className={`${summaryRule} my-2`} />
                <div
                  className={`flex justify-between text-base font-bold ${headingText}`}
                >
                  <span>Total</span>
                  <span className="text-red-500">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus,
                    )}`}
                  >
                    {getStatusLabel(order.orderStatus)}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2
                className={`text-xl font-bold ${headingText} mb-4 flex items-center gap-2`}
              >
                <FaMapMarkerAlt className="text-red-500" />
                Shipping Address
              </h2>
              <div className={`text-sm space-y-1 ${bodyText}`}>
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                {order.shippingAddress.addressLine1 ? (
                  <p>{order.shippingAddress.addressLine1}</p>
                ) : null}
                <p>
                  {order.shippingAddress.village}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.district}, {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </div>

            <div className={`${surface} rounded-2xl shadow-md p-6`}>
              <h2
                className={`text-xl font-bold ${headingText} mb-4 flex items-center gap-2`}
              >
                {order.paymentMethod === "cod" ? (
                  <FaMoneyBillWave className="text-green-500" />
                ) : (
                  <FaCreditCard className="text-blue-500" />
                )}
                Payment Info
              </h2>
              <div className={`text-sm space-y-2 ${bodyText}`}>
                <div className="flex justify-between items-center gap-4">
                  <span>Method</span>
                  {order.paymentMethod === "razorpay" ? (
                    <img
                      src="/razorpay-icon.png"
                      alt="razorpay"
                      className="w-20"
                    />
                  ) : (
                    <img src="/cod-icon.png" alt="cod" className="w-12 md:w-20" />
                  )}
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.paymentStatus,
                    )}`}
                  >
                    {getStatusLabel(order.paymentStatus)}
                  </span>
                </div>
                {order.razorpayOrderId ? (
                  <div className="flex justify-between gap-3">
                    <span>Razorpay Order ID</span>
                    <span className="text-right break-all">
                      {order.razorpayOrderId}
                    </span>
                  </div>
                ) : null}
                {order.razorpayPaymentId ? (
                  <div className="flex justify-between gap-3">
                    <span>Razorpay Payment ID</span>
                    <span className="text-right break-all">
                      {order.razorpayPaymentId}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {order.orderStatus !== "cancelled" ? (
              <div className={`${surface} rounded-2xl shadow-md p-6 flex flex-col gap-3`}>
                {canUserCancel ? (
                  <button
                    onClick={openCancelDialog}
                    disabled={isUpdating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? <AuthButtonLoader /> : "Cancel Order"}
                  </button>
                ) : null}

                {canUserRequestReturn ? (
                  <button
                    onClick={openReturnDialog}
                    disabled={isUpdating}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? <AuthButtonLoader /> : "Request Return"}
                  </button>
                ) : null}

                {isReturnFlow ? (
                  <div className={`text-sm ${bodyText}`}>
                    Current return status:{" "}
                    <span className="font-semibold">
                      {getStatusLabel(order.orderStatus)}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmText={
          confirmMeta.type === "cancel" ? "Cancel Order" : "Request Return"
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={isUpdating}
      />
    </div>
  );
};

export default OrderDetailsPage;
