import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Ban,
  Clock3,
  MapPin,
  PackageCheck,
  RotateCcw,
} from "lucide-react";
import {
  useGetAssignedOrdersQuery,
  useSendDeliveryCompletionOtpMutation,
  useUpdateOrderStatusMutation,
  useVerifyDeliveryCompletionOtpMutation,
} from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatStatus = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const OrderDetailsPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetAssignedOrdersQuery();
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMeta, setOtpMeta] = useState(null);
  const [sendDeliveryCompletionOtp, { isLoading: isSendingOtp }] =
    useSendDeliveryCompletionOtpMutation();
  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderStatusMutation();
  const [verifyDeliveryCompletionOtp, { isLoading: isVerifyingOtp }] =
    useVerifyDeliveryCompletionOtpMutation();

  const order = useMemo(
    () => (data?.orders || []).find((item) => item._id === orderId),
    [data?.orders, orderId]
  );

  const timeline = useMemo(() => {
    if (!order) return [];

    const entries = [...(order.statusHistory || [])].sort(
      (a, b) => new Date(a.at || 0) - new Date(b.at || 0)
    );

    if (!entries.length) {
      return [
        {
          to: order.orderStatus,
          at: order.updatedAt || order.createdAt,
          reason: "Assigned order loaded into delivery dashboard",
        },
      ];
    }

    return entries;
  }, [order]);

  const handleSendOtp = async () => {
    try {
      const response = await sendDeliveryCompletionOtp(orderId).unwrap();
      setOtpMeta(response?.deliveryConfirmation || null);
      setOtpCode("");
      setOtpDialogOpen(true);
      toast.success(response?.message || "Delivery OTP sent");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to send delivery OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      toast.error("Please enter OTP");
      return;
    }

    try {
      await verifyDeliveryCompletionOtp({
        orderId,
        otp: otpCode.trim(),
      }).unwrap();
      toast.success("OTP verified and order marked delivered");
      setOtpDialogOpen(false);
      setOtpCode("");
      setOtpMeta(null);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "OTP verification failed");
    }
  };

  const handleStatusUpdate = async ({ status, reason, successMessage, confirmText }) => {
    if (confirmText && !window.confirm(confirmText)) {
      return;
    }

    try {
      await updateOrderStatus({
        orderId,
        body: {
          status,
          reason,
        },
      }).unwrap();

      toast.success(successMessage);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Status update failed");
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading order details..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message="Order details load nahi ho pa rahe."
        onRetry={refetch}
      />
    );
  }

  if (!order) {
    return <ErrorMessage title="Order not found" message="Ye order aapko assign nahi hai." />;
  }

  const canMarkDelivered = order.orderStatus === "out_for_delivery";
  const canCancelOrder = ["processing", "shipped", "out_for_delivery"].includes(
    order.orderStatus
  );
  const canCompleteReturn = order.orderStatus === "return_approved";
  const isReturnRequested = order.orderStatus === "return_requested";

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/orders")}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
      >
        <ArrowLeft size={16} />
        Back to orders
      </button>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Order details
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                #{order.orderId}
              </h1>
            </div>
            <span className="rounded-full bg-indigo-500/15 px-4 py-2 text-sm font-medium text-indigo-200">
              {formatStatus(order.orderStatus)}
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                Customer
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {order.shippingAddress?.fullName}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {order.shippingAddress?.phone}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                Order value
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCurrency(order.totalAmount)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Payment: {String(order.paymentMethod || "").toUpperCase()}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center gap-3">
              <MapPin className="text-indigo-300" size={20} />
              <h2 className="text-lg font-semibold text-white">Delivery address</h2>
            </div>
            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p>{order.shippingAddress?.addressLine1}</p>
              <p>
                {order.shippingAddress?.village}, {order.shippingAddress?.city},{" "}
                {order.shippingAddress?.district}
              </p>
              <p>
                {order.shippingAddress?.state} - {order.shippingAddress?.postalCode}
              </p>
              <p>{order.shippingAddress?.country}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-lg font-semibold text-white">Items</h2>
            <div className="mt-4 space-y-3">
              {order.items?.map((item, index) => (
                <div
                  key={`${item.productId}_${index}`}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.product?.image?.[0] || "/logo-light.png"}
                      alt={item.product?.name || "Product"}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {item.product?.name || "Product"}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Qty: {item.quantity} • {item.productType}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-lg font-semibold text-white">Quick delivery actions</h2>
            <div className="mt-5 grid gap-3">
              {canMarkDelivered ? (
                <button
                  onClick={handleSendOtp}
                  disabled={!canMarkDelivered || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingOtp && canMarkDelivered ? (
                    <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                  ) : (
                    <PackageCheck size={18} />
                  )}
                  Send Delivery OTP
                </button>
              ) : null}

              {canCancelOrder ? (
                <button
                  onClick={() =>
                    handleStatusUpdate({
                      status: "cancelled",
                      reason: "Cancelled by delivery partner due to delivery issue",
                      successMessage: "Order cancelled successfully",
                      confirmText:
                        "Kya aap sure ho ki is order ko cancel karna hai?",
                    })
                  }
                  disabled={isUpdatingStatus || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <AuthButtonLoader />
                  ) : (
                    <Ban size={18} />
                  )}
                  Cancel Order
                </button>
              ) : null}

              {canCompleteReturn ? (
                <button
                  onClick={() =>
                    handleStatusUpdate({
                      status: "return_completed",
                      reason: "Return pickup completed by delivery partner",
                      successMessage: "Return pickup completed",
                      confirmText:
                        "Kya return package pickup complete ho gaya hai?",
                    })
                  }
                  disabled={isUpdatingStatus || isSendingOtp || isVerifyingOtp}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingStatus ? (
                    <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                  ) : (
                    <RotateCcw size={18} />
                  )}
                  Mark Return Picked Up
                </button>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              {canMarkDelivered
                ? "Customer ke email par OTP jayega. Package handover ke baad OTP verify karne par hi order `delivered` mark hoga."
                : canCompleteReturn
                ? "Vendor ne return approve kar diya hai. Pickup complete hone par return ko close karo."
                : isReturnRequested
                ? "Customer ne return request bheji hai. Vendor approval ke baad pickup action yahan show hoga."
                : canCancelOrder
                ? "Agar delivery issue ho to delivery partner yahan se order cancel kar sakta hai."
                : "Is status par delivery-side koi direct action available nahi hai."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex items-center gap-3">
              <Clock3 className="text-indigo-300" size={18} />
              <h2 className="text-lg font-semibold text-white">Tracking timeline</h2>
            </div>
            <div className="mt-5 space-y-4">
              {timeline.map((entry, index) => (
                <div key={`${entry.to}_${entry.at || index}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-3.5 w-3.5 rounded-full bg-indigo-400" />
                    {index !== timeline.length - 1 ? (
                      <div className="mt-1 h-full min-h-10 w-px bg-slate-800" />
                    ) : null}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-white">
                      {formatStatus(entry.to)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(entry.at)}
                    </p>
                    {entry.reason ? (
                      <p className="mt-2 text-sm text-slate-400">{entry.reason}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {otpDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!isSendingOtp && !isVerifyingOtp) {
                setOtpDialogOpen(false);
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <h3 className="text-xl font-bold text-white">Verify Delivery OTP</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              OTP customer ke email
              {otpMeta?.sentTo ? ` ${otpMeta.sentTo}` : ""} par bheja gaya hai.
              Product handover hone ke baad OTP lekar yahan verify karo.
            </p>

            {otpMeta?.otpExpireAt ? (
              <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
                OTP valid till{" "}
                {new Date(otpMeta.otpExpireAt).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}

            <div className="mt-5">
              <label className="text-sm font-medium text-slate-200">
                Enter customer OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="6-digit OTP"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isVerifyingOtp}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSendingOtp ? <AuthButtonLoader size={16} /> : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otpCode.trim() || isVerifyingOtp || isSendingOtp}
                className="inline-flex min-h-[3rem] items-center justify-center rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifyingOtp ? (
                  <AuthButtonLoader
                    size={16}
                    className="border-slate-950/30 border-t-slate-950"
                  />
                ) : (
                  "Verify & Mark Delivered"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrderDetailsPage;
