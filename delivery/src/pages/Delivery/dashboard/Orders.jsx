import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useGetAssignedOrdersQuery } from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { getDeliveryOrderPath } from "../../../utils/orderRouting";

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

const Orders = () => {
  const { data, isLoading, isError, refetch } = useGetAssignedOrdersQuery();

  if (isLoading) {
    return <PageLoader message="Loading assigned orders..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message="Assigned orders load nahi ho pa rahe."
        onRetry={refetch}
      />
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Orders
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Assigned Orders</h1>
      </div>

      <div className="grid gap-4">
        {orders.length ? (
          orders.map((order) => (
            <Link
              key={order._id}
              to={getDeliveryOrderPath(order)}
              className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/40 hover:bg-slate-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Order #{order.orderId}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {order.shippingAddress?.fullName} • {order.shippingAddress?.city},{" "}
                    {order.shippingAddress?.state}
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                  {formatStatus(order.orderStatus)}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-400 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Total
                  </p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Items
                  </p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {order.items?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-600">
                    Payment
                  </p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {String(order.paymentMethod || "").toUpperCase()}
                  </p>
                </div>
                <div className="flex items-end justify-end">
                  <span className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                    View details
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-900/40 px-5 py-14 text-center text-sm text-slate-500">
            Abhi tak aapko koi order assign nahi hua hai.
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
