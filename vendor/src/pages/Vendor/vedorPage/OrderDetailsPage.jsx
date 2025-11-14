import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaBoxOpen, FaMapMarkerAlt, FaArrowLeft } from "react-icons/fa";
import toast from "react-hot-toast";
import {
  useGetVendorOrdersQuery,
  useUpdateOrderStatusMutation,
} from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import ConfirmDialog from "../../../component/ConfirmDialog";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useGetVendorOrdersQuery();
  const orders = ordersData?.orders || [];
  const order = orders.find((o) => o._id === orderId);

  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

  // NEW: local action loader to show loader only on the button that triggered action
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState({
    title: "",
    description: "",
    payload: null,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openConfirm = (title, description, payload) => {
    setConfirmMeta({ title, description, payload });
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    if (!confirmMeta.payload) return;
    // set a generic actionLoading so UI can show per-button loader if needed
    const actionKey = confirmMeta.payload.__actionKey || "generic";
    setActionLoading(actionKey);
    try {
      await updateOrderStatus({
        orderId: order._id,
        body: confirmMeta.payload,
      }).unwrap();
      toast.success("Order updated");
      await refetch();
    } catch (err) {
      const msg =
        err?.data?.message || err?.message || "Failed to update order";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  if (isError) return <ErrorMessage onRetry={refetch} />;
  if (isLoading) {
    return (
      <div className="h-[26rem] grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <PageLoader message="Loading order..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center bg-white rounded-2xl shadow-xl p-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
              <FaBoxOpen className="w-12 h-12 text-indigo-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-8">
              The order you are looking for does not exist.
            </p>
            <button
              onClick={() => navigate("/vendor/orders")}
              className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusOptions = ["processing", "shipped", "delivered"];
  const canCancel =
    order.orderStatus !== "delivered" && order.orderStatus !== "cancelled";
  const isReturnRequested = order.orderStatus === "return_requested";
  const isReturnApproved = order.orderStatus === "return_approved";

  const handleSetStatus = (status) => {
    openConfirm(`Set status to ${status}`, `Set order status to "${status}"?`, {
      status,
      reason: `Status changed to ${status} by vendor`,
      __actionKey: `status_${status}`,
    });
  };

  const handleCancel = () => {
    openConfirm(
      "Cancel Order",
      "Are you sure you want to cancel this order? This cannot be undone.",
      {
        status: "cancelled",
        reason: "Cancelled by vendor",
        __actionKey: "cancel",
      }
    );
  };

  const handleReturnApprove = () => {
    openConfirm(
      "Approve Return",
      "Approve return request and mark payment as refund (DB-only).",
      {
        status: "return_approved",
        reason: "Return approved by vendor",
        __actionKey: "approve",
      }
    );
  };

  const handleReturnReject = () => {
    openConfirm("Reject Return", "Reject the return request.", {
      status: "return_rejected",
      reason: "Return rejected by vendor",
      __actionKey: "reject",
    });
  };

  const handleReturnComplete = () => {
    openConfirm(
      "Complete Return",
      "Mark return as completed and mark payment refunded (DB-only).",
      {
        status: "return_completed",
        reason: "Return completed by vendor",
        __actionKey: "complete",
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16">
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between mt-8 mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            Order Details #{order.orderId}
          </h1>
          <button
            onClick={() => navigate("/vendor/orders")}
            className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-medium"
          >
            <FaArrowLeft size={14} />
            <span>Back</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden p-6">
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-600">Current status</div>
                    <div
                      className={`mt-2 px-3 py-1 rounded-full text-sm font-medium ${
                        order.orderStatus?.startsWith("return")
                          ? "bg-yellow-500 text-white"
                          : order.orderStatus === "cancelled"
                          ? "bg-red-500 text-white"
                          : order.orderStatus === "delivered"
                          ? "bg-green-500 text-white"
                          : "bg-blue-500 text-white"
                      }`}
                    >
                      {order.orderStatus}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {statusOptions.map((s) => {
                      const key = `status_${s}`;
                      const loadingThis = actionLoading === key;
                      return (
                        <button
                          key={s}
                          disabled={
                            isUpdating ||
                            order.orderStatus === "cancelled" ||
                            order.orderStatus === "return_completed"
                          }
                          onClick={() => handleSetStatus(s)}
                          className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                          {loadingThis ? <AuthButtonLoader size={14} /> : s}
                        </button>
                      );
                    })}

                    {canCancel && (
                      <button
                        onClick={handleCancel}
                        disabled={isUpdating}
                        className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-sm disabled:opacity-50 flex items-center gap-2"
                      >
                        {actionLoading === "cancel" ? (
                          <AuthButtonLoader
                            className="text-red-600"
                            size={14}
                          />
                        ) : (
                          "Cancel"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ... rest of items table / mobile layout (unchanged) ... */}
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
                    {order.items.map((item, idx) => (
                      <tr
                        key={`${item.productId}_${idx}`}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={
                                item.product.image?.[0] || "/fallback-image.jpg"
                              }
                              alt={item.product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {item.product.name}
                              </h4>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.productType}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {item.variant || "Default"}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-indigo-600 font-bold">
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
                {order.items.map((item, idx) => (
                  <div
                    key={`${item.productId}_${idx}`}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div className="flex gap-4 items-center">
                      <img
                        src={item.product.image?.[0] || "/fallback-image.jpg"}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-semibold text-gray-800">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {item.productType}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </p>
                      <div className="text-right">
                        <p className="text-indigo-600 font-bold">
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
                  <span>{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-500 font-medium">Free</span>
                </div>
                <hr className="border-gray-200 my-2" />
                <div className="flex justify-between text-base font-bold text-gray-800">
                  <span>Total</span>
                  <span className="text-indigo-600">
                    ₹{order.totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.orderStatus?.startsWith("return")
                        ? "bg-yellow-500 text-white"
                        : order.orderStatus === "cancelled"
                        ? "bg-red-500 text-white"
                        : order.orderStatus === "delivered"
                        ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                    }`}
                  >
                    {order.orderStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaMapMarkerAlt className="text-indigo-500" />
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

            <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-3">
              {isReturnRequested && (
                <>
                  <button
                    onClick={handleReturnApprove}
                    disabled={isUpdating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                  >
                    {actionLoading === "approve" ? (
                      <AuthButtonLoader className="text-white" size={16} />
                    ) : (
                      "Approve Return"
                    )}
                  </button>
                  <button
                    onClick={handleReturnReject}
                    disabled={isUpdating}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    {actionLoading === "reject" ? (
                      <AuthButtonLoader className="text-white" size={16} />
                    ) : (
                      "Reject Return"
                    )}
                  </button>
                </>
              )}

              {isReturnApproved && (
                <button
                  onClick={handleReturnComplete}
                  disabled={isUpdating}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center"
                >
                  {actionLoading === "complete" ? (
                    <AuthButtonLoader className="text-white" size={16} />
                  ) : (
                    "Mark Return Completed"
                  )}
                </button>
              )}

              {!isReturnRequested && !isReturnApproved && (
                <div className="text-sm text-gray-600">
                  Vendor actions available in the header buttons
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMeta.title}
        description={confirmMeta.description}
        confirmText="Confirm"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={isUpdating}
      />
    </div>
  );
};

export default OrderDetailsPage;
