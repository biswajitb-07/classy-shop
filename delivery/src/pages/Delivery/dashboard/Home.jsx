import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Activity,
  Bike,
  CheckCircle2,
  ChevronRight,
  MapPinned,
  PackageCheck,
  RotateCcw,
  Route,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetDashboardSummaryQuery } from "../../../features/api/authApi";
import { useGetAssignedOrdersQuery } from "../../../features/api/orderApi";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { getDeliveryOrderPath } from "../../../utils/orderRouting";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const formatStatus = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-xl">
      {label ? <p className="text-xs font-semibold text-slate-400">{label}</p> : null}
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm text-white">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="capitalize">{entry.name}</span>
            <span className="ml-auto font-semibold">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    key: "returnPickupOrders",
    label: "Return Pickups",
    accent: "from-violet-500/20 to-violet-500/5",
    icon: RotateCcw,
  },
  {
    key: "completedOrders",
    label: "Completed",
    accent: "from-emerald-500/20 to-emerald-500/5",
    icon: CheckCircle2,
  },
  {
    key: "approvedPayoutAmount",
    label: "Approved Payout",
    accent: "from-fuchsia-500/20 to-fuchsia-500/5",
    icon: Route,
  },
];

const statusColors = {
  out_for_delivery: "#f59e0b",
  return_approved: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#f43f5e",
};

const chartCardClass =
  "rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20";

const shimmerClass =
  "animate-pulse rounded-[1.5rem] border border-slate-800 bg-slate-900/70 shadow-xl shadow-slate-950/10";

const DeliveryDashboardSkeleton = () => (
  <div className="space-y-6">
    <section className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.22),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.96)_100%)] p-6 shadow-xl shadow-slate-950/40">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-slate-800" />
          <div className="h-10 w-72 rounded-full bg-slate-800" />
          <div className="h-4 w-[26rem] max-w-full rounded-full bg-slate-800" />
          <div className="h-4 w-[20rem] max-w-full rounded-full bg-slate-800" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/70 px-5 py-4">
              <div className="h-3 w-24 rounded-full bg-slate-800" />
              <div className="mt-4 h-8 w-28 rounded-full bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className={`${shimmerClass} p-5`}>
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded-full bg-slate-800" />
            <div className="h-12 w-12 rounded-2xl bg-slate-800" />
          </div>
          <div className="mt-5 h-10 w-24 rounded-full bg-slate-800" />
        </div>
      ))}
    </section>

    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {[0, 1].map((item) => (
        <div key={item} className={`${shimmerClass} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-6 w-52 rounded-full bg-slate-800" />
              <div className="h-4 w-72 rounded-full bg-slate-800" />
            </div>
            <div className="h-8 w-24 rounded-full bg-slate-800" />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <div key={card} className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5">
                <div className="h-3 w-20 rounded-full bg-slate-800" />
                <div className="mt-4 h-8 w-24 rounded-full bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      {[0, 1].map((item) => (
        <div key={item} className={`${shimmerClass} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="h-6 w-56 rounded-full bg-slate-800" />
              <div className="h-4 w-72 rounded-full bg-slate-800" />
            </div>
            <div className="h-5 w-5 rounded-full bg-slate-800" />
          </div>
          <div className="mt-6 h-72 rounded-[1.5rem] bg-slate-950/70" />
        </div>
      ))}
    </section>

    <section className={`${shimmerClass} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-6 w-52 rounded-full bg-slate-800" />
          <div className="h-4 w-72 rounded-full bg-slate-800" />
        </div>
        <div className="h-5 w-5 rounded-full bg-slate-800" />
      </div>
      <div className="mt-6 h-72 rounded-[1.5rem] bg-slate-950/70" />
    </section>

    <section className={`${shimmerClass} p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-6 w-56 rounded-full bg-slate-800" />
          <div className="h-4 w-72 rounded-full bg-slate-800" />
        </div>
        <div className="h-10 w-24 rounded-2xl bg-slate-800" />
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-4 w-36 rounded-full bg-slate-800" />
                <div className="h-3 w-44 rounded-full bg-slate-800" />
              </div>
              <div className="h-7 w-24 rounded-full bg-slate-800" />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="h-3 w-16 rounded-full bg-slate-800" />
              <div className="h-3 w-20 rounded-full bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

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
    return <DeliveryDashboardSkeleton />;
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
  const payoutSummary = summary.payoutSummary || {};
  const orders = ordersData?.orders || [];
  const recentOrders = orders.slice(0, 5);
  const totalValue = orders.reduce(
    (sum, order) => sum + Number(order.totalAmount || 0),
    0
  );
  const liveTrackingCount =
    summary.liveTrackingOrders ||
    orders.filter((order) => order.deliveryTracking?.isLive).length;

  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });

  const trendData = last7Days.map((date) => {
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);

    const dayOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt || 0);
      return createdAt >= date && createdAt < nextDate;
    });

    return {
      label: date.toLocaleDateString("en-IN", { weekday: "short" }),
      assigned: dayOrders.length,
      completed: dayOrders.filter((order) => order.orderStatus === "delivered").length,
      returns: dayOrders.filter((order) => order.orderStatus === "return_completed")
        .length,
    };
  });

  const statusMixData = [
    {
      name: "Out for Delivery",
      value:
        summary.outForDeliveryOrders ||
        orders.filter((order) => order.orderStatus === "out_for_delivery").length,
      color: statusColors.out_for_delivery,
    },
    {
      name: "Return Pickup",
      value:
        summary.returnPickupOrders ||
        orders.filter((order) => order.orderStatus === "return_approved").length,
      color: statusColors.return_approved,
    },
    {
      name: "Delivered",
      value:
        summary.completedOrders ||
        orders.filter((order) => order.orderStatus === "delivered").length,
      color: statusColors.delivered,
    },
    {
      name: "Cancelled",
      value:
        summary.cancelledOrders ||
        orders.filter((order) => order.orderStatus === "cancelled").length,
      color: statusColors.cancelled,
    },
  ].filter((item) => item.value > 0);

  const snapshotData = [
    {
      name: "Live tracking",
      value: liveTrackingCount,
      color: "#06b6d4",
    },
    {
      name: "COD orders",
      value: orders.filter((order) => order.paymentMethod === "cod").length,
      color: "#6366f1",
    },
    {
      name: "Paid orders",
      value: orders.filter((order) => order.paymentMethod === "razorpay").length,
      color: "#22c55e",
    },
    {
      name: "Return flow",
      value: orders.filter((order) => String(order.orderStatus || "").startsWith("return"))
        .length,
      color: "#f97316",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.22),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.96)_100%)] p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Welcome back
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              {deliveryPartner?.name || "Delivery Partner"}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Aaj ke active drop-offs, return pickups, aur live tracking signals yahin
              se handle kar sakte ho.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-300/80">
                Assigned GMV
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatCurrency(totalValue)}
              </p>
            </div>
            <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                Live Tracking
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatCompact(liveTrackingCount)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              {key === "approvedPayoutAmount"
                ? formatCurrency(payoutSummary.approvedAmount || 0)
                : summary[key] || 0}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className={chartCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Payout snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Admin approved aur paid payout amounts yahan reflect hote rahenge.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
              Finance sync
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Approved",
                value: formatCurrency(payoutSummary.approvedAmount || 0),
                tone: "text-fuchsia-300",
              },
              {
                label: "Paid",
                value: formatCurrency(payoutSummary.paidAmount || 0),
                tone: "text-emerald-300",
              },
              {
                label: "Rejected",
                value: formatCurrency(payoutSummary.rejectedAmount || 0),
                tone: "text-rose-300",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5"
              >
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {item.label}
                </p>
                <p className={`mt-3 text-2xl font-black ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Recent payout updates</h2>
              <p className="mt-1 text-sm text-slate-400">
                Latest approved, paid, ya rejected payout entries.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
              {payoutSummary.totalPayouts || 0} records
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {(payoutSummary.recentPayouts || []).length ? (
              payoutSummary.recentPayouts.map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(entry.payoutAmount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                      {formatStatus(entry.status)}
                    </span>
                  </div>
                  {entry.processedNotes ? (
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {entry.processedNotes}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
                Abhi tak koi payout update nahi aaya hai.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className={chartCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Delivery activity chart</h2>
              <p className="mt-1 text-sm text-slate-400">
                Last 7 days me assigned, completed, aur return closures.
              </p>
            </div>
            <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
              Realtime-ready
            </div>
          </div>

          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="assignedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={getChartTooltip} />
                <Area
                  type="monotone"
                  dataKey="assigned"
                  name="Assigned"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  fill="url(#assignedGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#completedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={chartCardClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Current order mix</h2>
              <p className="mt-1 text-sm text-slate-400">
                Delivery pipeline me abhi kis type ka load chal raha hai.
              </p>
            </div>
            <Route className="text-slate-300" size={18} />
          </div>

          <div className="mt-3 grid gap-5 lg:grid-cols-[0.95fr_1.05fr] xl:grid-cols-1 2xl:grid-cols-[0.95fr_1.05fr]">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusMixData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {statusMixData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={getChartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {statusMixData.length ? (
                statusMixData.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                      </div>
                      <p className="text-lg font-black text-white">{item.value}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
                  Charts richer ho jayenge jaise hi delivery assignments badhenge.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={chartCardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Operational snapshot</h2>
            <p className="mt-1 text-sm text-slate-400">
              Delivery-side workload aur payment mix ka quick bar view.
            </p>
          </div>
          <Activity className="text-slate-300" size={18} />
        </div>

        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={snapshotData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="5 5" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={getChartTooltip} />
              <Bar dataKey="value" name="Count" radius={[16, 16, 6, 6]} maxBarSize={72}>
                {snapshotData.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={chartCardClass}>
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
                to={getDeliveryOrderPath(order)}
                className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-indigo-500/40 hover:bg-slate-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">#{order.orderId}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.shippingAddress?.fullName} • {order.shippingAddress?.city}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.deliveryTracking?.isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold text-cyan-200">
                        <MapPinned size={12} />
                        Live
                      </span>
                    ) : null}
                    <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-200">
                      {formatStatus(order.orderStatus)}
                    </span>
                  </div>
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
