import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiBox,
  FiClock,
  FiPackage,
  FiRefreshCw,
  FiShoppingBag,
  FiTarget,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";
import { LuBadgeIndianRupee } from "react-icons/lu";
import { RiAlarmWarningLine } from "react-icons/ri";
import { useGetFashionItemsQuery } from "../../../features/api/fashion/fashionApi";
import { useGetElectronicItemsQuery } from "../../../features/api/electronic/electronicApi";
import { useGetBagItemsQuery } from "../../../features/api/bag/bagApi";
import { useGetGroceryItemsQuery } from "../../../features/api/grocery-product/groceryApi";
import { useGetFootwearItemsQuery } from "../../../features/api/footwear-product/footwearApi";
import { useGetBeautyItemsQuery } from "../../../features/api/beauty-product/beautyApi";
import { useGetWellnessItemsQuery } from "../../../features/api/wellness-product/wellnessApi";
import { useGetJewelleryItemsQuery } from "../../../features/api/jewellery-product/jewelleryApi";
import { useGetVendorOrdersQuery } from "../../../features/api/orderApi";
import { useGetDashboardSummaryQuery } from "../../../features/api/authApi";
import { useTheme } from "../../../context/ThemeContext";
import { connectVendorSocket } from "../../../lib/socket";
import { getVendorOrderPath } from "../../../utils/orderRouting";
import ChartTooltip from "../../../component/charts/ChartTooltip";
import CategoryInventoryBarChart from "../../../component/charts/CategoryInventoryBarChart";
import CategoryCatalogSharePieChart from "../../../component/charts/CategoryCatalogSharePieChart";
import CategoryPriceStockChart from "../../../component/charts/CategoryPriceStockChart";
import StatusFunnelChart from "../../../component/charts/StatusFunnelChart";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const shortDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const statusPalette = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  shipped: "bg-violet-100 text-violet-700 border-violet-200",
  out_for_delivery: "bg-orange-100 text-orange-700 border-orange-200",
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const SectionCard = ({
  title,
  subtitle,
  action,
  children,
  className = "",
  style,
  dark = false,
}) => (
  <section
    style={{ animation: "fadeRise 0.7s ease-out both", ...style }}
    className={`rounded-[30px] border p-5 backdrop-blur xl:p-6 ${
      dark
        ? "border-slate-700 bg-[#0f172a]/95 text-slate-100 shadow-[0_18px_60px_rgba(0,0,0,0.38)]"
        : "border-white/70 bg-white/88 text-slate-900 shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
    } ${className}`}
  >
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2
          className={`text-lg font-black tracking-tight ${dark ? "text-white" : "text-slate-950"}`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className={`mt-1 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const MetricChip = ({ icon: Icon, label, value, tone, dark = false }) => (
  <div
    className={`rounded-[24px] border p-4 ${tone}`}
    style={{ animation: "fadeRise 0.6s ease-out both" }}
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p
          className={`text-xs font-semibold uppercase tracking-[0.16em] ${dark ? "text-slate-400" : "text-slate-500"}`}
        >
          {label}
        </p>
        <p
          className={`mt-3 text-2xl font-black tracking-tight ${dark ? "text-white" : "text-slate-950"}`}
        >
          {value}
        </p>
      </div>
      <div
        className={`rounded-2xl p-3 shadow-sm ${dark ? "bg-slate-950/60" : "bg-white/80"}`}
      >
        <Icon className={`text-xl ${dark ? "text-white" : "text-slate-900"}`} />
      </div>
    </div>
  </div>
);

const TrendChart = ({
  title,
  value,
  points,
  labels,
  stroke,
  fill,
  footer,
  dark = false,
}) => {
  const chartData = labels.map((label, index) => ({
    label,
    value: points[index] ?? 0,
  }));

  return (
    <div
      className={`rounded-[28px] border p-5 ${dark ? "border-slate-700 bg-[#111827] text-slate-100" : "border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900"}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-sm font-semibold ${dark ? "text-slate-300" : "text-slate-500"}`}
          >
            {title}
          </p>
          <h3
            className={`mt-2 text-3xl font-black tracking-tight ${dark ? "text-white" : "text-slate-950"}`}
          >
            {value}
          </h3>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${dark ? "border-slate-600 text-slate-300" : "border-slate-200 text-slate-600"}`}
        >
          Last 7 days
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id={`trendFill-${title.replace(/\s+/g, "-")}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
                <stop offset="100%" stopColor={fill} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="6 6"
              stroke={dark ? "#334155" : "#e2e8f0"}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{
                fill: dark ? "#94a3b8" : "#64748b",
                fontSize: 11,
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              cursor={{ stroke: stroke, strokeOpacity: 0.35, strokeWidth: 2 }}
              content={
                <ChartTooltip
                  dark={dark}
                  formatter={(tooltipValue) => formatCompact(tooltipValue)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              name={title}
              stroke={stroke}
              fill={`url(#trendFill-${title.replace(/\s+/g, "-")})`}
              strokeWidth={3}
              activeDot={{
                r: 6,
                fill: stroke,
                stroke: dark ? "#0f172a" : "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p
        className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}
      >
        {footer}
      </p>
    </div>
  );
};
const Home = () => {
  const vendor = useSelector((state) => state.auth.vendor);
  const { isDark } = useTheme();
  const [liveRefreshCount, setLiveRefreshCount] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date());
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const dashboardQueryOptions = {
    pollingInterval: 30000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  };
  const { data: fashionData, isLoading: fashionLoading, refetch: refetchFashion } =
    useGetFashionItemsQuery(undefined, dashboardQueryOptions);
  const {
    data: electronicData,
    isLoading: electronicLoading,
    refetch: refetchElectronic,
  } =
    useGetElectronicItemsQuery(undefined, dashboardQueryOptions);
  const { data: bagData, isLoading: bagLoading, refetch: refetchBag } =
    useGetBagItemsQuery(undefined, dashboardQueryOptions);
  const { data: groceryData, isLoading: groceryLoading, refetch: refetchGrocery } =
    useGetGroceryItemsQuery(undefined, dashboardQueryOptions);
  const {
    data: footwearData,
    isLoading: footwearLoading,
    refetch: refetchFootwear,
  } =
    useGetFootwearItemsQuery(undefined, dashboardQueryOptions);
  const { data: beautyData, isLoading: beautyLoading, refetch: refetchBeauty } =
    useGetBeautyItemsQuery(undefined, dashboardQueryOptions);
  const {
    data: wellnessData,
    isLoading: wellnessLoading,
    refetch: refetchWellness,
  } =
    useGetWellnessItemsQuery(undefined, dashboardQueryOptions);
  const {
    data: jewelleryData,
    isLoading: jewelleryLoading,
    refetch: refetchJewellery,
  } =
    useGetJewelleryItemsQuery(undefined, dashboardQueryOptions);
  const { data: ordersData, isLoading: ordersLoading, refetch: refetchOrders } =
    useGetVendorOrdersQuery(undefined, dashboardQueryOptions);
  const { data: summaryData, isLoading: summaryLoading, refetch: refetchSummary } =
    useGetDashboardSummaryQuery(undefined, dashboardQueryOptions);

  const categoryStats = useMemo(
    () => [
      {
        label: "Fashion",
        items: fashionData?.fashionItems ?? [],
        href: "/fashion-products",
        stroke: "#f43f5e",
      },
      {
        label: "Electronics",
        items: electronicData?.electronicItems ?? [],
        href: "/electronic-products",
        stroke: "#0ea5e9",
      },
      {
        label: "Bags",
        items: bagData?.bagItems ?? [],
        href: "/bag-products",
        stroke: "#f59e0b",
      },
      {
        label: "Groceries",
        items: groceryData?.groceryItems ?? [],
        href: "/grocery-products",
        stroke: "#22c55e",
      },
      {
        label: "Footwear",
        items: footwearData?.footwearItems ?? [],
        href: "/footwear-products",
        stroke: "#a855f7",
      },
      {
        label: "Beauty",
        items: beautyData?.beautyItems ?? [],
        href: "/beauty-products",
        stroke: "#ec4899",
      },
      {
        label: "Wellness",
        items: wellnessData?.wellnessItems ?? [],
        href: "/wellness-products",
        stroke: "#14b8a6",
      },
      {
        label: "Jewellery",
        items: jewelleryData?.jewelleryItems ?? [],
        href: "/jewellery-products",
        stroke: "#eab308",
      },
    ],
    [
      bagData?.bagItems,
      beautyData?.beautyItems,
      electronicData?.electronicItems,
      fashionData?.fashionItems,
      footwearData?.footwearItems,
      groceryData?.groceryItems,
      jewelleryData?.jewelleryItems,
      wellnessData?.wellnessItems,
    ],
  );

  const orders = ordersData?.orders ?? [];

  const dashboard = useMemo(() => {
    const summary = summaryData?.summary ?? {
      totalAdmins: 0,
      totalUsers: 0,
      totalVendors: 0,
      totalDeliveryPartners: 0,
      recentAdmins: 0,
      recentUsers: 0,
      recentVendors: 0,
      recentDeliveryPartners: 0,
    };
    const categories = categoryStats.map((category) => ({
      ...category,
      count: category.items.length,
      inventory: category.items.reduce(
        (sum, item) => sum + Number(item?.inStock ?? 0),
        0,
      ),
      stockValue: category.items.reduce(
        (sum, item) =>
          sum +
          Number(item?.discountedPrice ?? item?.originalPrice ?? 0) *
            Number(item?.inStock ?? 0),
        0,
      ),
      averageTicket: category.items.length
        ? category.items.reduce(
            (sum, item) =>
              sum + Number(item?.discountedPrice ?? item?.originalPrice ?? 0),
            0,
          ) / category.items.length
        : 0,
    }));

    const allProducts = categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,
        categoryLabel: category.label,
        href: category.href,
      })),
    );
    const totalProducts = allProducts.length;
    const totalInventory = allProducts.reduce(
      (sum, item) => sum + Number(item?.inStock ?? 0),
      0,
    );
    const totalStockValue = categories.reduce(
      (sum, category) => sum + category.stockValue,
      0,
    );
    const lowStockItems = allProducts
      .filter(
        (item) =>
          Number(item?.inStock ?? 0) > 0 && Number(item?.inStock ?? 0) <= 5,
      )
      .sort((a, b) => Number(a?.inStock ?? 0) - Number(b?.inStock ?? 0))
      .slice(0, 6);
    const outOfStockCount = allProducts.filter(
      (item) => Number(item?.inStock ?? 0) === 0,
    ).length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + Number(order?.totalAmount ?? 0),
      0,
    );
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
    const deliveredOrders = orders.filter(
      (order) => order?.orderStatus === "delivered",
    ).length;
    const pendingOrders = orders.filter((order) =>
      ["pending", "processing", "shipped", "out_for_delivery"].includes(
        order?.orderStatus,
      ),
    ).length;
    const fulfillmentRate = orders.length
      ? Math.round((deliveredOrders / orders.length) * 100)
      : 0;
    const orderStatusCounts = [
      "pending",
      "processing",
      "shipped",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ].map((status) => ({
      status,
      count: orders.filter((order) => order?.orderStatus === status).length,
    }));
    const maxStatusCount = Math.max(
      1,
      ...orderStatusCounts.map((status) => status.count),
    );
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
      .slice(0, 5);

    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      return date;
    });

    const revenueSeries = last7Days.map((date) => {
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      const ordersForDay = orders.filter((order) => {
        const orderDate = new Date(order?.createdAt || 0);
        return orderDate >= date && orderDate < nextDate;
      });
      return {
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        revenue: ordersForDay.reduce(
          (sum, order) => sum + Number(order?.totalAmount ?? 0),
          0,
        ),
        orders: ordersForDay.length,
      };
    });

    const topCategory = [...categories].sort((a, b) => b.count - a.count)[0];
    const audienceSeries = [
      {
        label: "Admins",
        value: summary.totalAdmins,
        recent: summary.recentAdmins,
        color: "#7c3aed",
        href: "/community/admins",
      },
      {
        label: "Users",
        value: summary.totalUsers,
        recent: summary.recentUsers,
        color: "#0ea5e9",
        href: "/community/users",
      },
      {
        label: "Vendors",
        value: summary.totalVendors,
        recent: summary.recentVendors,
        color: "#fb7185",
        href: "/community/vendors",
      },
      {
        label: "Delivery",
        value: summary.totalDeliveryPartners,
        recent: summary.recentDeliveryPartners,
        color: "#10b981",
        href: "/delivery-partners",
      },
    ];

    return {
      categories,
      totalProducts,
      totalInventory,
      totalStockValue,
      lowStockItems,
      outOfStockCount,
      totalRevenue,
      averageOrderValue,
      deliveredOrders,
      pendingOrders,
      fulfillmentRate,
      orderStatusCounts,
      maxStatusCount,
      recentOrders,
      revenueSeries,
      topCategory,
      audienceSeries,
      summary,
    };
  }, [categoryStats, orders, summaryData]);

  const categoryAnalyticsData = useMemo(
    () =>
      dashboard.categories
        .filter((category) => category.count > 0)
        .map((category) => ({
          name: category.label,
          items: category.count,
          stock: category.inventory,
          avgPrice: Math.round(category.averageTicket || 0),
          value: Math.round(category.stockValue || 0),
          color: category.stroke,
        })),
    [dashboard.categories],
  );

  const isInitialLoading =
    fashionLoading &&
    electronicLoading &&
    bagLoading &&
    groceryLoading &&
    footwearLoading &&
    beautyLoading &&
    wellnessLoading &&
    jewelleryLoading &&
    ordersLoading &&
    summaryLoading;
  const firstName =
    vendor?.fullName?.split(" ")?.[0] ||
    vendor?.storeName ||
    vendor?.name ||
    "Seller";
  const liveUpdateLabel = useMemo(
    () =>
      lastUpdatedAt.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    [lastUpdatedAt],
  );
  const refreshDashboard = useCallback(async () => {
    setIsRefreshingDashboard(true);
    try {
      await Promise.allSettled([
        refetchFashion(),
        refetchElectronic(),
        refetchBag(),
        refetchGrocery(),
        refetchFootwear(),
        refetchBeauty(),
        refetchWellness(),
        refetchJewellery(),
        refetchOrders(),
        refetchSummary(),
      ]);
      setLiveRefreshCount((count) => count + 1);
      setLastUpdatedAt(new Date());
    } finally {
      setIsRefreshingDashboard(false);
    }
  }, [
    refetchBag,
    refetchBeauty,
    refetchElectronic,
    refetchFashion,
    refetchFootwear,
    refetchGrocery,
    refetchJewellery,
    refetchOrders,
    refetchSummary,
    refetchWellness,
  ]);

  useEffect(() => {
    if (!vendor?._id) return undefined;

    const socket = connectVendorSocket();
    const handleRealtimeRefresh = () => {
      refreshDashboard();
    };

    socket.on("connect", handleRealtimeRefresh);
    socket.on("vendor:dashboard:update", handleRealtimeRefresh);
    socket.on("vendor:summary:update", handleRealtimeRefresh);

    return () => {
      socket.off("connect", handleRealtimeRefresh);
      socket.off("vendor:dashboard:update", handleRealtimeRefresh);
      socket.off("vendor:summary:update", handleRealtimeRefresh);
    };
  }, [refreshDashboard, vendor?._id]);

  if (isInitialLoading) {
    return (
      <div
        className={`min-h-screen p-4 md:p-6 ${isDark ? "bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.95),_transparent_28%),linear-gradient(180deg,#050816_0%,#0f172a_55%,#111827_100%)]" : "bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_28%),linear-gradient(180deg,#fffaf8_0%,#f8fafc_55%,#eef2ff_100%)]"}`}
      >
        <div className="space-y-6 animate-pulse">
          <div
            className={`rounded-[34px] border p-6 ${
              isDark
                ? "border-slate-800 bg-slate-900/80"
                : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_60%,#eef2ff_100%)] shadow-[0_16px_40px_rgba(148,163,184,0.16)]"
            }`}
          >
            <div className="space-y-4">
              <div
                className={`h-4 w-32 rounded-full ${
                  isDark ? "bg-slate-700" : "bg-sky-100"
                }`}
              />
              <div
                className={`h-12 max-w-[34rem] rounded-[24px] ${
                  isDark ? "bg-slate-800" : "bg-slate-200"
                }`}
              />
              <div
                className={`h-4 max-w-[28rem] rounded-[24px] ${
                  isDark ? "bg-slate-800" : "bg-slate-200"
                }`}
              />
              <div className="flex flex-wrap gap-3 pt-2">
                <div
                  className={`h-12 w-40 rounded-full ${
                    isDark ? "bg-slate-800" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`h-12 w-40 rounded-full ${
                    isDark ? "bg-slate-800" : "bg-slate-200"
                  }`}
                />
                <div
                  className={`h-12 w-36 rounded-full ${
                    isDark ? "bg-slate-800" : "bg-emerald-100"
                  }`}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`rounded-[26px] border p-4 ${
                  isDark
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_60%,#eef2ff_100%)] shadow-[0_14px_30px_rgba(148,163,184,0.14)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div
                      className={`h-3 w-24 rounded-full ${
                        isDark ? "bg-slate-700" : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-8 w-28 rounded-[20px] ${
                        isDark ? "bg-slate-800" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div
                    className={`h-12 w-12 rounded-2xl ${
                      isDark ? "bg-slate-800" : "bg-sky-100"
                    }`}
                  />
                </div>
                <div
                  className={`mt-4 h-3 w-32 rounded-full ${
                    isDark ? "bg-slate-700" : "bg-slate-200"
                  }`}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className={`rounded-[30px] border p-5 ${
                  isDark
                    ? "border-slate-800 bg-slate-900/80"
                    : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_60%,#eef2ff_100%)] shadow-[0_16px_40px_rgba(148,163,184,0.16)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div
                      className={`h-4 w-36 rounded-full ${
                        isDark ? "bg-slate-700" : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-8 w-28 rounded-[20px] ${
                        isDark ? "bg-slate-800" : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div
                    className={`h-8 w-24 rounded-full ${
                      isDark ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  />
                </div>
                <div className="mt-6 flex h-[16rem] items-end gap-3">
                  {Array.from({ length: 7 }).map((__, barIndex) => (
                    <div
                      key={barIndex}
                      className={`flex-1 rounded-[18px] ${
                        isDark ? "bg-slate-800" : "bg-slate-200"
                      }`}
                      style={{
                        height: `${45 + ((barIndex % 4) + 1) * 24}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className={`rounded-[30px] border p-5 ${
              isDark
                ? "border-slate-800 bg-slate-900/80"
                : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_60%,#eef2ff_100%)] shadow-[0_16px_40px_rgba(148,163,184,0.16)]"
            }`}
          >
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className={`grid grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto] items-center gap-3 rounded-[22px] px-4 py-4 ${
                    isDark ? "bg-slate-950/55" : "bg-white/90"
                  }`}
                >
                  <div
                    className={`h-4 rounded-[20px] ${
                      isDark ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-4 rounded-[20px] ${
                      isDark ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  />
                  <div
                    className={`h-9 w-20 rounded-full ${
                      isDark ? "bg-slate-800" : "bg-slate-200"
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen`}
    >
      <div className="mx-auto max-w-9xl space-y-6 pb-6">
        <section
          className={`relative overflow-hidden rounded-[36px] border p-5 md:p-7 xl:p-8 ${
            isDark
              ? "border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,113,133,0.16),transparent_30%),linear-gradient(135deg,#050816_0%,#0b1120_38%,#0f172a_72%,#111827_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.52)]"
              : "border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_28%),linear-gradient(135deg,#f8fbff_0%,#eff6ff_42%,#eef2ff_72%,#ffffff_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
          }`}
          style={{ animation: "fadeRise 0.8s ease-out both" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.12),transparent_22%)]" />
          <div
            className={`absolute inset-x-0 top-0 h-px ${isDark ? "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]" : "bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.35),transparent)]"}`}
          />

          <div className="relative grid gap-6">
            <div className="grid gap-6">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] backdrop-blur ${isDark ? "border-white/12 bg-white/5 text-slate-200" : "border-slate-200 bg-white/80 text-slate-700"}`}
                  >
                    <FiActivity
                      className={`${isDark ? "text-violet-300" : "text-violet-600"}`}
                    />
                    Performance cockpit
                  </div>
                  <div
                    className={`inline-flex items-center rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"}`}
                  >
                    Live insights
                  </div>
                </div>

                <div className="max-w-4xl">
                  <p
                    className={`text-sm font-semibold uppercase tracking-[0.24em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Vendor analytics workspace
                  </p>
                  <h1
                    className={`mt-4  font-black leading-[1.02] sm:text-[1rem] max-w-full xl:text-[1.8rem] tracking-wide ${isDark ? "text-white" : "text-slate-950"}`}
                  >
                    Welcome back, {firstName}. Your sales signals, inventory
                    health, and order flow are all in sync.
                  </h1>
                  <p
                    className={`mt-5 max-w-2xl text-sm leading-7 sm:text-base ${isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    Stay ahead with one premium control surface for revenue
                    movement, category strength, fulfillment pace, and stock
                    decisions across your store.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/orders"
                    className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 ${isDark ? "bg-[linear-gradient(135deg,#38bdf8_0%,#8b5cf6_50%,#f43f5e_100%)] text-white shadow-[0_18px_40px_rgba(139,92,246,0.35)]" : "bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] hover:bg-slate-800"}`}
                  >
                    View Analytics
                  </Link>
                  <Link
                    to={dashboard.topCategory?.href || "/fashion-products"}
                    className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold backdrop-blur transition duration-300 hover:-translate-y-0.5 ${isDark ? "border-white/12 bg-white/5 text-slate-100 hover:bg-white/10" : "border-slate-200 bg-white/80 text-slate-900 hover:bg-white"}`}
                  >
                    Manage Products
                  </Link>
                  <button
                    type="button"
                    onClick={refreshDashboard}
                    disabled={isRefreshingDashboard}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold backdrop-blur transition duration-300 hover:-translate-y-0.5 ${isDark ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                  >
                    <FiRefreshCw
                      size={16}
                      className={isRefreshingDashboard ? "animate-spin" : ""}
                    />
                    {isRefreshingDashboard ? "Refreshing..." : "Refresh Data"}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: "Net revenue",
                      value: formatCurrency(dashboard.totalRevenue),
                      meta: "Across recent order activity",
                    },
                    {
                      label: "Fulfillment rate",
                      value: `${dashboard.fulfillmentRate}%`,
                      meta: `${formatCompact(dashboard.deliveredOrders)} delivered`,
                    },
                    {
                      label: "Top category",
                      value: dashboard.topCategory?.label || "No data",
                      meta: `${formatCompact(dashboard.totalProducts)} active products`,
                    },
                  ].map((item, index) => (
                    <div
                      key={`${item.label}-${liveRefreshCount}`}
                      className={`rounded-[24px] border px-4 py-4 backdrop-blur transition duration-300 hover:-translate-y-1 ${isDark ? "border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(15,23,42,0.38)]" : "border-white/80 bg-white/80 shadow-[0_14px_40px_rgba(148,163,184,0.15)]"}`}
                      style={{
                        animation: `fadeRise 0.85s ease-out both ${0.08 * (index + 1)}s`,
                      }}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        {item.label}
                      </p>
                      <p
                        className={`mt-3 text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}
                      >
                        {item.value}
                      </p>
                      <p
                        className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        {item.meta}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`relative rounded-[30px] border p-4 backdrop-blur md:p-5 ${isDark ? "border-white/10 bg-white/[0.05] shadow-[0_24px_80px_rgba(2,6,23,0.48)]" : "border-white/80 bg-white/82 shadow-[0_24px_60px_rgba(148,163,184,0.18)]"}`}
                style={{ animation: "fadeRise 0.95s ease-out both" }}
              >
                <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.18),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_30%)]" />

                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Analytics preview
                      </p>
                      <h3
                        className={`mt-2 text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}
                      >
                        Weekly pulse
                      </h3>
                      <p
                        className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}
                      >
                        Real-time trend preview for orders, revenue, and catalog
                        readiness.
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "bg-slate-900/80 text-slate-300 ring-1 ring-white/10" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}
                    >
                      Live {liveUpdateLabel}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      {
                        label: "Open orders",
                        value: formatCompact(dashboard.pendingOrders),
                      },
                      {
                        label: "Catalog units",
                        value: formatCompact(dashboard.totalInventory),
                      },
                      {
                        label: "Avg order",
                        value: formatCurrency(dashboard.averageOrderValue),
                      },
                    ].map((stat) => (
                      <div
                        key={`${stat.label}-${liveRefreshCount}`}
                        className={`rounded-[22px] border px-4 py-3 ${isDark ? "border-white/10 bg-slate-950/45" : "border-slate-200 bg-white/90"}`}
                      >
                        <p
                          className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {stat.label}
                        </p>
                        <p
                          className={`mt-2 text-2xl font-black ${isDark ? "text-white" : "text-slate-950"}`}
                        >
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`relative rounded-[26px] border p-4 ${isDark ? "border-white/10 bg-slate-950/45" : "border-slate-200 bg-white/90"}`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p
                          className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-slate-700"}`}
                        >
                          Activity momentum
                        </p>
                        <p
                          className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Hover states and motion optimized for the dashboard
                          surface.
                        </p>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-600"}`}
                      >
                        {formatCompact(
                          dashboard.revenueSeries.reduce(
                            (sum, day) => sum + day.orders,
                            0,
                          ),
                        )}{" "}
                        orders
                      </div>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          key={`weekly-pulse-${liveRefreshCount}`}
                          data={dashboard.revenueSeries.map((day) => ({
                            name: day.label,
                            orders: day.orders,
                          }))}
                          margin={{ top: 8, right: 0, left: -18, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="5 5"
                            stroke={isDark ? "#334155" : "#e2e8f0"}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="name"
                            tick={{
                              fill: isDark ? "#94a3b8" : "#64748b",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide />
                          <Tooltip
                            cursor={{
                              fill: isDark
                                ? "rgba(148,163,184,0.08)"
                                : "rgba(15,23,42,0.05)",
                            }}
                            content={
                              <ChartTooltip
                                dark={isDark}
                                formatter={(value) =>
                                  `${formatCompact(value)} orders`
                                }
                              />
                            }
                          />
                          <Bar
                            dataKey="orders"
                            name="Orders"
                            radius={[18, 18, 6, 6]}
                            maxBarSize={44}
                          >
                            {dashboard.revenueSeries.map((day) => (
                              <Cell
                                key={day.label}
                                fill={day.orders ? "#fb7185" : "#8b5cf6"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          style={{ animation: "fadeRise 0.75s ease-out both" }}
        >
          <MetricChip
            dark={isDark}
            icon={FiPackage}
            label="Products"
            value={formatCompact(dashboard.totalProducts)}
            tone={
              isDark
                ? "border-slate-700 bg-slate-900/90"
                : "border-rose-100 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)]"
            }
          />
          <MetricChip
            dark={isDark}
            icon={FiClock}
            label="Pending orders"
            value={formatCompact(dashboard.pendingOrders)}
            tone={
              isDark
                ? "border-slate-700 bg-slate-900/90"
                : "border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)]"
            }
          />
          <MetricChip
            dark={isDark}
            icon={FiBox}
            label="Inventory units"
            value={formatCompact(dashboard.totalInventory)}
            tone={
              isDark
                ? "border-slate-700 bg-slate-900/90"
                : "border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)]"
            }
          />
          <MetricChip
            dark={isDark}
            icon={RiAlarmWarningLine}
            label="Out of stock"
            value={formatCompact(dashboard.outOfStockCount)}
            tone={
              isDark
                ? "border-slate-700 bg-slate-900/90"
                : "border-violet-100 bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_100%)]"
            }
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            dark={isDark}
            title="Big Trend Analytics"
            subtitle="Revenue and order motion across the last 7 days."
            style={{ animationDelay: "0.08s" }}
          >
            <div className="grid gap-5">
              <TrendChart
                key={`revenue-trend-${liveRefreshCount}`}
                dark={isDark}
                title="Revenue trend"
                value={formatCurrency(
                  dashboard.revenueSeries.reduce(
                    (sum, day) => sum + day.revenue,
                    0,
                  ),
                )}
                points={dashboard.revenueSeries.map((item) => item.revenue)}
                labels={dashboard.revenueSeries.map((item) => item.label)}
                stroke="#fb7185"
                fill="#fb7185"
                footer="Use this curve to understand short-term earning movement."
              />
              <TrendChart
                key={`order-velocity-${liveRefreshCount}`}
                dark={isDark}
                title="Order velocity"
                value={formatCompact(
                  dashboard.revenueSeries.reduce(
                    (sum, day) => sum + day.orders,
                    0,
                  ),
                )}
                points={dashboard.revenueSeries.map((item) => item.orders)}
                labels={dashboard.revenueSeries.map((item) => item.label)}
                stroke="#0ea5e9"
                fill="#0ea5e9"
                footer="Daily order frequency makes it easy to spot active selling days."
              />
            </div>
          </SectionCard>

          <SectionCard dark={isDark} style={{ animationDelay: "0.14s" }}>
            <div className="grid gap-5">
              <div>
                <div className="mb-4">
                  <h3
                    className={`text-base font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Catalog Share Chart
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      isDark ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Items per category shown as a responsive share view.
                  </p>
                </div>
                {categoryAnalyticsData.length ? (
                  <CategoryCatalogSharePieChart
                    key={`catalog-share-${liveRefreshCount}`}
                    dark={isDark}
                    data={categoryAnalyticsData}
                  />
                ) : (
                  <div
                    className={`rounded-[24px] border p-8 text-center ${
                      isDark
                        ? "border-slate-700 bg-slate-900/80"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <FiShoppingBag className="mx-auto text-4xl text-slate-400" />
                    <p
                      className={`mt-3 text-lg font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      No product data yet
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        isDark ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      Add products to see category analytics in chart format.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <div className="mb-4">
                  <h3
                    className={`text-base font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Price Vs Stock Chart
                  </h3>
                  <p
                    className={`mt-1 text-sm ${
                      isDark ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Average price and stock depth side by side for each
                    category.
                  </p>
                </div>
                {categoryAnalyticsData.length ? (
                  <CategoryPriceStockChart
                    key={`price-stock-${liveRefreshCount}`}
                    dark={isDark}
                    data={categoryAnalyticsData}
                  />
                ) : (
                  <div
                    className={`rounded-[24px] border p-8 text-center ${
                      isDark
                        ? "border-slate-700 bg-slate-900/80"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <FiShoppingBag className="mx-auto text-4xl text-slate-400" />
                    <p
                      className={`mt-3 text-lg font-bold ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      No price signals yet
                    </p>
                    <p
                      className={`mt-1 text-sm ${
                        isDark ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      Category comparisons will appear here as products are
                      added.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
        <SectionCard
          dark={isDark}
          title="Platform Audience Analytics"
          subtitle="Users, vendors, and delivery partners with hover-friendly distribution."
          style={{ animationDelay: "0.18s" }}
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div
              className={`relative rounded-[26px] border p-5 ${isDark ? "border-slate-700 bg-[#0f172a] text-slate-100" : "border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900"}`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Audience totals
                  </p>
                  <h3
                    className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-950"}`}
                  >
                    {formatCompact(
                      dashboard.summary.totalAdmins +
                        dashboard.summary.totalUsers +
                        dashboard.summary.totalVendors +
                        dashboard.summary.totalDeliveryPartners,
                    )}
                  </h3>
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${isDark ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}
                >
                  Hover-ready blocks
                </div>
              </div>
              <div className="space-y-4">
                {dashboard.audienceSeries.map((item) => {
                  const totalAudience = Math.max(
                    dashboard.summary.totalAdmins +
                      dashboard.summary.totalUsers +
                      dashboard.summary.totalVendors +
                      dashboard.summary.totalDeliveryPartners,
                    1,
                  );
                  return (
                    <Link
                      key={`${item.label}-${liveRefreshCount}`}
                      to={item.href}
                      className={`block rounded-[22px] border p-4 transition-all duration-300 hover:-translate-y-1 ${isDark ? "border-slate-700 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-900" : "border-slate-100 bg-slate-50/80 hover:bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <p
                            className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                          >
                            {item.label}
                          </p>
                        </div>
                        <p
                          className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}
                        >
                          {formatCompact(item.value)}
                        </p>
                      </div>
                      <div
                        className={`mt-3 h-3 overflow-hidden rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(item.value / totalAudience) * 100}%`,
                            backgroundColor: item.color,
                            transformOrigin: "left",
                            animation: `growBar 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards ${0.12 * (dashboard.audienceSeries.indexOf(item) + 1)}s`,
                          }}
                        />
                      </div>
                      <p
                        className={`mt-2 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        Last 30 days: {formatCompact(item.recent)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div
              className={`rounded-[26px] border p-5 text-white ${isDark ? "border-slate-700 bg-[linear-gradient(135deg,#050816_0%,#111827_45%,#0ea5e9_100%)]" : "border-slate-100 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#0ea5e9_100%)]"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Community growth chart
                  </p>

                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  Live summary
                </div>
              </div>
              <div className="mt-8 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    key={`audience-growth-${liveRefreshCount}`}
                    data={dashboard.audienceSeries.map((item) => ({
                      name: item.label,
                      value: item.value,
                      recent: item.recent,
                      fill: item.color,
                    }))}
                    margin={{ top: 10, right: 0, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="5 5"
                      stroke="rgba(255,255,255,0.14)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.06)" }}
                      content={
                        <ChartTooltip
                          dark
                          formatter={(value, _name, payload) =>
                            `${formatCompact(value)} total | +${formatCompact(payload.recent)} recent`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="value"
                      name="Audience"
                      radius={[20, 20, 8, 8]}
                      maxBarSize={80}
                    >
                      {dashboard.audienceSeries.map((item) => (
                        <Cell key={item.label} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </SectionCard>
        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <SectionCard
            dark={isDark}
            title="Status Funnel"
            subtitle="Small-to-mid level order flow distribution."
            style={{ animationDelay: "0.22s" }}
          >
            <StatusFunnelChart
              key={`status-funnel-${liveRefreshCount}`}
              dark={isDark}
              data={dashboard.orderStatusCounts}
            />
          </SectionCard>

          <SectionCard
            dark={isDark}
            title="Inventory Value Chart"
            subtitle="Bar view of category value using live catalog analytics."
            style={{ animationDelay: "0.26s" }}
          >
            {categoryAnalyticsData.length ? (
              <CategoryInventoryBarChart
                key={`inventory-value-${liveRefreshCount}`}
                dark={isDark}
                data={categoryAnalyticsData}
              />
            ) : (
              <div
                className={`rounded-[24px] border p-8 text-center ${isDark ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}
              >
                <FiShoppingBag className="mx-auto text-4xl text-slate-400" />
                <p
                  className={`mt-3 text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  No inventory analytics yet
                </p>
                <p
                  className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}
                >
                  Category value charts will appear as your catalog grows.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard
            dark={isDark}
            title="Recent Order Analytics"
            subtitle="Latest order list with amount and status signals."
            action={
              <Link
                to="/orders"
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                View all
              </Link>
            }
            style={{ animationDelay: "0.3s" }}
          >
            {dashboard.recentOrders.length ? (
              <div className="space-y-3">
                {dashboard.recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    to={getVendorOrderPath(order)}
                    className={`grid gap-4 rounded-[24px] border p-4 transition md:grid-cols-[1fr_auto_auto] ${isDark ? "border-slate-700 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-900" : "border-slate-100 bg-slate-50/80 hover:border-slate-200 hover:bg-white"}`}
                  >
                    <div>
                      <p
                        className={`font-semibold ${isDark ? "text-white" : "text-slate-950"}`}
                      >
                        Order #{order.orderId || order._id?.slice(-6)}
                      </p>
                      <p
                        className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}
                      >
                        {shortDate(order.createdAt)} ·{" "}
                        {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p
                        className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}
                      >
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p
                        className={`text-xs ${isDark ? "text-slate-300" : "text-slate-500"}`}
                      >
                        {order.paymentMethod || "payment pending"}
                      </p>
                    </div>
                    <div className="flex items-center md:justify-end">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${statusPalette[order.orderStatus] || "border-slate-200 bg-slate-100 text-slate-700"}`}
                      >
                        {(order.orderStatus || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className={`rounded-[24px] border p-8 text-center ${isDark ? "border-slate-700 bg-slate-900/80" : "border-slate-100 bg-slate-50"}`}
              >
                <FiShoppingBag className="mx-auto text-4xl text-slate-400" />
                <p
                  className={`mt-3 text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  No orders yet
                </p>
                <p
                  className={`mt-1 text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}
                >
                  Charts will become richer as customer orders start arriving.
                </p>
              </div>
            )}
          </SectionCard>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard
            dark={isDark}
            title="Big Picture"
            subtitle="High-value business metrics."
          >
            <div className="space-y-4">
              <div
                className={`rounded-[22px] p-4 ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.15em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  Avg order value
                </p>
                <p
                  className={`mt-3 text-3xl font-black ${isDark ? "text-white" : "text-slate-950"}`}
                >
                  {formatCurrency(dashboard.averageOrderValue)}
                </p>
              </div>
              <div
                className={`rounded-[22px] p-4 ${isDark ? "bg-slate-900/80" : "bg-slate-50"}`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.15em] ${isDark ? "text-slate-400" : "text-slate-500"}`}
                >
                  Stock valuation
                </p>
                <p
                  className={`mt-3 text-3xl font-black ${isDark ? "text-white" : "text-slate-950"}`}
                >
                  {formatCurrency(dashboard.totalStockValue)}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            dark={isDark}
            title="Focus Actions"
            subtitle="Jump straight into key areas."
          >
            <div className="grid gap-3">
              <Link
                to="/fashion-products"
                className="rounded-[22px] bg-[linear-gradient(135deg,#fb7185_0%,#f97316_100%)] px-5 py-4 font-semibold text-white transition hover:opacity-90"
              >
                Open Fashion Dashboard
              </Link>
              <Link
                to="/electronic-products"
                className="rounded-[22px] bg-[linear-gradient(135deg,#0ea5e9_0%,#06b6d4_100%)] px-5 py-4 font-semibold text-white transition hover:opacity-90"
              >
                Open Electronics Dashboard
              </Link>
              <Link
                to="/orders"
                className="rounded-[22px] bg-[linear-gradient(135deg,#1e293b_0%,#334155_100%)] px-5 py-4 font-semibold text-white shadow-[0_16px_30px_rgba(15,23,42,0.25)] transition hover:brightness-110"
              >
                Manage Order Flow
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            dark={isDark}
            title="Growth Signal"
            subtitle="What the panel is telling you right now."
          >
            <div
              className={`rounded-[24px] p-5 ${isDark ? "bg-[linear-gradient(135deg,#111827_0%,#0f172a_45%,#1e293b_100%)]" : "bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)]"}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-2xl p-3 shadow-sm ${isDark ? "bg-slate-950" : "bg-white"}`}
                >
                  <FiTrendingUp
                    className={`text-xl ${isDark ? "text-white" : "text-slate-900"}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                  >
                    Suggested next move
                  </p>
                  <p
                    className={`text-lg font-black ${isDark ? "text-white" : "text-slate-950"}`}
                  >
                    Balance catalog depth and order conversion
                  </p>
                </div>
              </div>
              <p
                className={`mt-4 text-sm leading-7 ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                Your strongest category is{" "}
                <span
                  className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {dashboard.topCategory?.label || "not available"}
                </span>
                . Keep it growing, but use slower categories and low-stock
                alerts to improve catalog breadth and avoid missed sales.
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Home;
