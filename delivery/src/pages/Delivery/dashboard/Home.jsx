import { Link } from "react-router-dom";
import { Bike, CheckCircle2, ChevronRight, PackageCheck } from "lucide-react";
import { useSelector } from "react-redux";
import { useGetDashboardSummaryQuery } from "../../../features/api/authApi";
import { useGetAssignedOrdersQuery } from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

const summaryCards = [
  {
    key: "assignedOrders",
    label: "Assigned Orders",
    accent: "from-sky-500/20 to-sky-500/5",
    icon: Bike,
  },
  {
    key: "outForDeliveryOrders",
    label: "Out for Delivery",
    accent: "from-amber-500/20 to-amber-500/5",
    icon: PackageCheck,
  },
  {
    key: "completedOrders",
    label: "Completed Deliveries",
    accent: "from-emerald-500/20 to-emerald-500/5",
    icon: CheckCircle2,
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const Home = () => {
  const { deliveryPartner } = useSelector((state) => state.auth);
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery();
  const {
    data: ordersData,
    isLoading: isOrdersLoading,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useGetAssignedOrdersQuery();

  if (isSummaryLoading || isOrdersLoading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  if (isSummaryError || isOrdersError) {
    return (
      <ErrorMessage
        message="Dashboard data load nahi ho pa raha."
        onRetry={() => {
          refetchSummary();
          refetchOrders();
        }}
      />
    );
  }

  const summary = summaryData?.summary || {};
  const orders = ordersData?.orders || [];
  const recentOrders = orders.slice(0, 5);
  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {deliveryPartner?.name || "Delivery Partner"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-400">
              Aaj ke assigned orders, active deliveries, aur quick actions yahin se
              handle kar sakte ho.
            </p>
          </div>
          <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300/80">
              Assigned GMV
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(totalValue)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ key, label, accent, icon: Icon }) => (
          <div
            key={key}
            className={`rounded-[1.75rem] border border-slate-800 bg-gradient-to-br ${accent} p-5`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-300">{label}</p>
              <div className="rounded-2xl bg-white/5 p-3 text-white">
                <Icon size={18} />
              </div>
            </div>
            <p className="mt-5 text-4xl font-black text-white">
              {summary[key] || 0}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Recent assigned orders</h2>
            <p className="mt-1 text-sm text-slate-400">
              Latest orders jo abhi aapke dashboard me assigned hain.
            </p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            View all
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentOrders.length ? (
            recentOrders.map((order) => (
              <Link
                key={order._id}
                to={`/orders/${order._id}`}
                className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-indigo-500/40 hover:bg-slate-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      #{order.orderId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.shippingAddress?.fullName} • {order.shippingAddress?.city}
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
                    {String(order.orderStatus || "")
                      .replace(/_/g, " ")
                      .toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
                  <span>{order.items?.length || 0} items</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
              Abhi tak koi assigned order nahi hai.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
