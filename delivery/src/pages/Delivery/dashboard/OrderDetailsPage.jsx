import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Clock3, MapPin, PackageCheck, Truck } from "lucide-react";
import {
  useGetAssignedOrdersQuery,
  useUpdateOrderStatusMutation,
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
  const [updateOrderStatus, { isLoading: isUpdating }] =
    useUpdateOrderStatusMutation();

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

  const submitStatus = async (status) => {
    try {
      await updateOrderStatus({
        orderId,
        body: {
          status,
          reason:
            status === "delivered"
              ? "Marked as delivered by delivery partner"
              : "Marked as out for delivery by delivery partner",
        },
      }).unwrap();
      toast.success(
        status === "delivered"
          ? "Order marked delivered"
          : "Order marked out for delivery"
      );
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

  const canMarkOutForDelivery = ["processing", "shipped"].includes(
    order.orderStatus
  );
  const canMarkDelivered = order.orderStatus === "out_for_delivery";

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
              <button
                onClick={() => submitStatus("out_for_delivery")}
                disabled={!canMarkOutForDelivery || isUpdating}
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating && canMarkOutForDelivery ? (
                  <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                ) : (
                  <Truck size={18} />
                )}
                Mark Out for Delivery
              </button>
              <button
                onClick={() => submitStatus("delivered")}
                disabled={!canMarkDelivered || isUpdating}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating && canMarkDelivered ? (
                  <AuthButtonLoader className="border-slate-950/30 border-t-slate-950" />
                ) : (
                  <PackageCheck size={18} />
                )}
                Mark Delivered
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Delivery dashboard se sirf assigned orders ko `out for delivery` aur
              `delivered` update kiya ja sakta hai.
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
    </div>
  );
};

export default OrderDetailsPage;
