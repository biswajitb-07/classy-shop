import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaBoxOpen,
  FaMapMarkerAlt,
  FaCreditCard,
  FaMoneyBillWave,
  FaArrowLeft,
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

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

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

  const orders = ordersData?.orders || [];
  const order = orders.find((o) => o._id === orderId);

  const getVariantDisplay = (productType, variant) => {
    if (!variant || variant === "default") return null;
    if (productType === "Fashion") {
      const [key, value] = variant.split(":");
      if (key === "size" && value) return `Size: ${value}`;
      return variant.replace(":", ": ");
    } else if (productType === "Electronics") {
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

  const getStatusColor = (status) => {
    if (!status) return "bg-gray-500 text-white";
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

  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (isLoading) {
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <PageLoader message="Loading order details..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-100 to-pink-100 rounded-full flex items-center justify-center">
              <FaBoxOpen className="w-12 h-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              The order you are looking for does not exist.
            </p>
            <button
              onClick={() => navigate("/orders")}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalItems = order.items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const statusOrder = ["pending", "processing", "shipped", "delivered"];
  const isReturnFlow =
    order.orderStatus && order.orderStatus.startsWith("return");
  const isCancelled = order.orderStatus === "cancelled";

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
    const idx = statusOrder.indexOf(status);
    return idx >= 0 ? ((idx + 1) / statusOrder.length) * 100 : 0;
  };

  const progressPercentage = progressForStatus(order.orderStatus);

  const canUserCancel = ["pending", "processing"].includes(order.orderStatus);
  const canUserRequestReturn = order.orderStatus === "delivered";

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
          : "Return requested successfully"
      );
      await refetch();
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Something went wrong";
      toast.error(msg);
    }
  };

  const returnLabel = (status) => {
    if (status === "return_requested") return "Return Requested";
    if (status === "return_approved") return "Return Approved";
    if (status === "return_rejected") return "Return Rejected";
    if (status === "return_completed") return "Return Completed";
    return "Return";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mt-8 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBoxOpen className="text-red-500" />
            Order Details #{order.orderId}
          </h1>
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-1 text-red-500 hover:text-red-600 font-medium"
          >
            <FaArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mb-8"></div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden p-6">
              <div className="mb-6">
                <div className="relative mb-2 h-6">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-green-200 rounded-full transform -translate-y-1/2"></div>
                  <div
                    className={`absolute top-1/2 left-0 h-1 rounded-full transform -translate-y-1/2 transition-all duration-700 ease-in-out ${
                      isReturnFlow
                        ? "bg-orange-500"
                        : isCancelled
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">Current status</div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus
                    )}`}
                  >
                    {isReturnFlow
                      ? returnLabel(order.orderStatus)
                      : order.orderStatus.charAt(0).toUpperCase() +
                        order.orderStatus.slice(1)}
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase">
                        Product
                      </th>
                      <th className="px-6 py-4 text-left font-semibold text-gray-600 uppercase">
                        Variant
                      </th>
                      <th className="px-6 py-4 text-center font-semibold text-gray-600 uppercase">
                        Qty
                      </th>
                      <th className="px-6 py-4 text-right font-semibold text-gray-600 uppercase">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items.map((item, index) => (
                      <tr
                        key={`${item.productId}_${index}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div
                            onClick={() =>
                              navigate(
                                `/${item.productType.toLowerCase()}/${item.productType.toLowerCase()}-product-details/${
                                  item.product._id
                                }`
                              )
                            }
                            className="flex items-center gap-4 cursor-pointer group"
                          >
                            <img
                              src={
                                item.product.image?.[0] || "/fallback-image.jpg"
                              }
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition"
                            />
                            <div>
                              <h4 className="font-semibold text-gray-800 group-hover:text-red-500">
                                {item.product.name}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.productType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getVariantDisplay(
                            item.productType,
                            item.variant
                          ) || (
                            <span className="text-gray-400 text-sm">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-red-500 font-bold">
                            ₹{item.subtotal.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            ₹{item.price.toLocaleString()} each
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-gray-100">
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
                          }`
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
                        <h4 className="font-semibold text-gray-800 group-hover:text-red-500">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.productType}
                        </p>
                        {getVariantDisplay(item.productType, item.variant) && (
                          <p className="text-xs text-blue-600">
                            {getVariantDisplay(item.productType, item.variant)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </p>
                      <div className="text-right">
                        <p className="text-red-500 font-bold">
                          ₹{item.subtotal.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          ₹{item.price.toLocaleString()} each
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Order Summary
              </h2>
              <div className="space-y-3 text-gray-600 text-sm">
                <div className="flex justify-between">
                  <span>Order ID</span>
                  <span>#{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <hr className="border-gray-200 my-2" />
                <div className="flex justify-between text-base font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-red-500">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.orderStatus
                    )}`}
                  >
                    {isReturnFlow
                      ? returnLabel(order.orderStatus)
                      : order.orderStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-red-500" />
                Shipping Address
              </h2>
              <div className="text-gray-600 text-sm space-y-1">
                <p className="font-medium">{order.shippingAddress.fullName}</p>
                {order.shippingAddress.addressLine1 && (
                  <p>{order.shippingAddress.addressLine1}</p>
                )}
                <p>
                  {order.shippingAddress.village}, {order.shippingAddress.city},{" "}
                  {order.shippingAddress.district},{" "}
                  {order.shippingAddress.state} -{" "}
                  {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                {order.paymentMethod === "cod" ? (
                  <FaMoneyBillWave className="text-green-500" />
                ) : (
                  <FaCreditCard className="text-blue-500" />
                )}{" "}
                Payment Info
              </h2>
              <div className="text-gray-600 text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span>Method</span>
                  {order.paymentMethod === "razorpay" ? (
                    <img
                      src="../razorpay-icon.png"
                      alt="razorpay"
                      className="w-20"
                    />
                  ) : (
                    <img
                      src="../cod-icon.png"
                      alt="cod"
                      className="w-12 md:w-20"
                    />
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      order.paymentStatus
                    )}`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
                {order.razorpayOrderId && (
                  <div className="flex justify-between">
                    <span>Razorpay Order ID</span>
                    <span>{order.razorpayOrderId}</span>
                  </div>
                )}
                {order.razorpayPaymentId && (
                  <div className="flex justify-between">
                    <span>Razorpay Payment ID</span>
                    <span>{order.razorpayPaymentId}</span>
                  </div>
                )}
              </div>
            </div>

            {order.orderStatus != "cancelled" && (
              <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3">
                {canUserCancel && (
                  <button
                    onClick={openCancelDialog}
                    disabled={isUpdating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? <AuthButtonLoader /> : "Cancel Order"}
                  </button>
                )}

                {canUserRequestReturn && (
                  <button
                    onClick={openReturnDialog}
                    disabled={isUpdating}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {isUpdating ? <AuthButtonLoader /> : "Request Return"}
                  </button>
                )}

                {isReturnFlow && (
                  <div className="text-sm text-gray-600">
                    Current return status:{" "}
                    <span className="font-semibold">
                      {returnLabel(order.orderStatus)}
                    </span>
                  </div>
                )}
              </div>
            )}
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
