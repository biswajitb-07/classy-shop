import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  FiActivity,
  FiArrowUpRight,
  FiBox,
  FiClock,
  FiPackage,
  FiShoppingBag,
  FiTarget,
  FiTrendingUp,
  FiTruck,
} from "react-icons/fi";
import { LuBadgeIndianRupee } from "react-icons/lu";
import { MdOutlineInventory2 } from "react-icons/md";
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
  delivered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
};

const SectionCard = ({ title, subtitle, action, children, className = "" }) => (
  <section className={`rounded-[30px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:p-6 ${className}`}>
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const MetricChip = ({ icon: Icon, label, value, tone }) => (
  <div className={`rounded-[24px] border p-4 ${tone}`}>
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{value}</p>
      </div>
      <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
        <Icon className="text-xl text-slate-900" />
      </div>
    </div>
  </div>
);

const buildLinePath = (points, width, height, padding = 18) => {
  if (!points.length) return "";
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);

  return points
    .map((value, index) => {
      const x =
        padding +
        (index * (width - padding * 2)) / Math.max(points.length - 1, 1);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
};

const buildAreaPath = (points, width, height, padding = 18) => {
  if (!points.length) return "";
  const line = buildLinePath(points, width, height, padding);
  const lastX = width - padding;
  const baseY = height - padding;
  return `${line} L ${lastX} ${baseY} L ${padding} ${baseY} Z`;
};

const TrendChart = ({ title, value, points, labels, stroke, fill, footer }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 520;
  const height = 220;
  const linePath = buildLinePath(points, width, height);
  const areaPath = buildAreaPath(points, width, height);
  const max = Math.max(...points, 1);

  return (
    <div className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</h3>
        </div>
        <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Last 7 days</div>
      </div>
      {hoveredIndex !== null ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stroke }} />
          {labels[hoveredIndex]}: {formatCompact(points[hoveredIndex])}
        </div>
      ) : null}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        {[0.25, 0.5, 0.75].map((step) => (
          <line
            key={step}
            x1="18"
            x2={width - 18}
            y1={height - 18 - step * (height - 36)}
            y2={height - 18 - step * (height - 36)}
            stroke="#e2e8f0"
            strokeDasharray="6 6"
          />
        ))}
        <path d={areaPath} fill={fill} opacity="0.22" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = 18 + (index * (width - 36)) / Math.max(points.length - 1, 1);
          const y = height - 18 - (point / max) * (height - 36);
          return (
            <g
              key={`${title}-${labels[index]}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={hoveredIndex === index ? "8" : "5"} fill={stroke} className="transition-all duration-200" />
              <text x={x} y={height - 4} textAnchor="middle" fontSize="11" fill="#64748b">
                {labels[index]}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-sm text-slate-500">{footer}</p>
    </div>
  );
};
const DonutChart = ({ data }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  let offset = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-center">
      <div className="relative mx-auto h-52 w-52">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="24" />
          {data.map((item) => {
            const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
            const circle = (
              <circle
                key={item.label}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={item.stroke}
                strokeWidth="24"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += (item.value / total) * circumference;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active mix</p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {formatCompact(hoveredItem?.value ?? total)}
          </p>
          <p className="text-sm text-slate-500">
            {hoveredItem ? hoveredItem.label : "total products"}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.label}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
            className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-slate-200 hover:bg-white"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.stroke }} />
                <p className="font-semibold text-slate-900">{item.label}</p>
              </div>
              <p className="text-sm font-bold text-slate-700">{item.value} items</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full" style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.stroke }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Hover insight: {Math.round((item.value / total) * 100)}% catalog share
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Home = () => {
  const vendor = useSelector((state) => state.auth.vendor);
  const { data: fashionData, isLoading: fashionLoading } = useGetFashionItemsQuery();
  const { data: electronicData, isLoading: electronicLoading } = useGetElectronicItemsQuery();
  const { data: bagData, isLoading: bagLoading } = useGetBagItemsQuery();
  const { data: groceryData, isLoading: groceryLoading } = useGetGroceryItemsQuery();
  const { data: footwearData, isLoading: footwearLoading } = useGetFootwearItemsQuery();
  const { data: beautyData, isLoading: beautyLoading } = useGetBeautyItemsQuery();
  const { data: wellnessData, isLoading: wellnessLoading } = useGetWellnessItemsQuery();
  const { data: jewelleryData, isLoading: jewelleryLoading } = useGetJewelleryItemsQuery();
  const { data: ordersData, isLoading: ordersLoading } = useGetVendorOrdersQuery();
  const { data: summaryData, isLoading: summaryLoading } =
    useGetDashboardSummaryQuery();

  const categoryStats = useMemo(
    () => [
      { label: "Fashion", items: fashionData?.fashionItems ?? [], href: "/fashion-products", stroke: "#f43f5e" },
      { label: "Electronics", items: electronicData?.electronicItems ?? [], href: "/electronic-products", stroke: "#0ea5e9" },
      { label: "Bags", items: bagData?.bagItems ?? [], href: "/bag-products", stroke: "#f59e0b" },
      { label: "Groceries", items: groceryData?.groceryItems ?? [], href: "/grocery-products", stroke: "#22c55e" },
      { label: "Footwear", items: footwearData?.footwearItems ?? [], href: "/footwear-products", stroke: "#a855f7" },
      { label: "Beauty", items: beautyData?.beautyItems ?? [], href: "/beauty-products", stroke: "#ec4899" },
      { label: "Wellness", items: wellnessData?.wellnessItems ?? [], href: "/wellness-products", stroke: "#14b8a6" },
      { label: "Jewellery", items: jewelleryData?.jewelleryItems ?? [], href: "/jewellery-products", stroke: "#eab308" },
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
    ]
  );

  const orders = ordersData?.orders ?? [];

  const dashboard = useMemo(() => {
    const summary = summaryData?.summary ?? {
      totalUsers: 0,
      totalVendors: 0,
      recentUsers: 0,
      recentVendors: 0,
    };
    const categories = categoryStats.map((category) => ({
      ...category,
      count: category.items.length,
      inventory: category.items.reduce((sum, item) => sum + Number(item?.inStock ?? 0), 0),
      stockValue: category.items.reduce((sum, item) => sum + Number(item?.discountedPrice ?? item?.originalPrice ?? 0) * Number(item?.inStock ?? 0), 0),
      averageTicket: category.items.length
        ? category.items.reduce((sum, item) => sum + Number(item?.discountedPrice ?? item?.originalPrice ?? 0), 0) / category.items.length
        : 0,
    }));

    const allProducts = categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryLabel: category.label, href: category.href })));
    const totalProducts = allProducts.length;
    const totalInventory = allProducts.reduce((sum, item) => sum + Number(item?.inStock ?? 0), 0);
    const totalStockValue = categories.reduce((sum, category) => sum + category.stockValue, 0);
    const lowStockItems = allProducts.filter((item) => Number(item?.inStock ?? 0) > 0 && Number(item?.inStock ?? 0) <= 5).sort((a, b) => Number(a?.inStock ?? 0) - Number(b?.inStock ?? 0)).slice(0, 6);
    const outOfStockCount = allProducts.filter((item) => Number(item?.inStock ?? 0) === 0).length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order?.totalAmount ?? 0), 0);
    const averageOrderValue = orders.length ? totalRevenue / orders.length : 0;
    const deliveredOrders = orders.filter((order) => order?.orderStatus === "delivered").length;
    const pendingOrders = orders.filter((order) => ["pending", "processing", "shipped"].includes(order?.orderStatus)).length;
    const fulfillmentRate = orders.length ? Math.round((deliveredOrders / orders.length) * 100) : 0;
    const orderStatusCounts = ["pending", "processing", "shipped", "delivered", "cancelled"].map((status) => ({ status, count: orders.filter((order) => order?.orderStatus === status).length }));
    const maxCategoryCount = Math.max(1, ...categories.map((category) => category.count));
    const maxStatusCount = Math.max(1, ...orderStatusCounts.map((status) => status.count));
    const recentOrders = [...orders].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)).slice(0, 5);

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
        revenue: ordersForDay.reduce((sum, order) => sum + Number(order?.totalAmount ?? 0), 0),
        orders: ordersForDay.length,
      };
    });

    const topCategory = [...categories].sort((a, b) => b.count - a.count)[0];
    const donutData = [...categories].filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 5).map((item) => ({ label: item.label, value: item.count, stroke: item.stroke }));

    const audienceSeries = [
      {
        label: "Users",
        value: summary.totalUsers,
        recent: summary.recentUsers,
        color: "#0ea5e9",
      },
      {
        label: "Vendors",
        value: summary.totalVendors,
        recent: summary.recentVendors,
        color: "#fb7185",
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
      maxCategoryCount,
      maxStatusCount,
      recentOrders,
      revenueSeries,
      topCategory,
      donutData,
      audienceSeries,
      summary,
    };
  }, [categoryStats, orders, summaryData]);

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
  const firstName = vendor?.fullName?.split(" ")?.[0] || vendor?.storeName || vendor?.name || "Seller";
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_28%),linear-gradient(180deg,#fffaf8_0%,#f8fafc_55%,#eef2ff_100%)] p-4 md:p-6">
        <div className="space-y-6 animate-pulse">
          <div className="h-64 rounded-[34px] bg-white/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[26px] bg-white/80" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-[28rem] rounded-[30px] bg-white/80" />
            <div className="h-[28rem] rounded-[30px] bg-white/80" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(244,63,94,0.18),_transparent_22%),radial-gradient(circle_at_right,_rgba(56,189,248,0.14),_transparent_26%),linear-gradient(180deg,#fff7f5_0%,#f8fafc_46%,#eef4ff_100%)] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,#08101e_0%,#172033_44%,#fb7185_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] md:p-8">
          <div className="absolute -left-10 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
                <FiActivity className="text-sm text-amber-300" />
                Multi-layer analytics panel
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">
                {firstName}, your vendor analytics now scale from quick signals to deeper chart intelligence.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                Watch revenue movement, order velocity, category mix, stock pressure, and top-performing product groups in one chart-first workspace.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <MetricChip icon={LuBadgeIndianRupee} label="Revenue" value={formatCurrency(dashboard.totalRevenue)} tone="border-white/10 bg-white/10" />
                <MetricChip icon={FiTruck} label="Fulfillment" value={`${dashboard.fulfillmentRate}%`} tone="border-white/10 bg-white/10" />
                <MetricChip icon={FiTarget} label="Top category" value={dashboard.topCategory?.label || "No data"} tone="border-white/10 bg-white/10" />
              </div>
            </div>
            <div className="rounded-[30px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Weekly Momentum</p>
                  <p className="mt-1 text-4xl font-black">{formatCompact(dashboard.revenueSeries.reduce((sum, day) => sum + day.orders, 0))}</p>
                  <p className="text-sm text-slate-200">orders in the last 7 days</p>
                </div>
                <Link to="/orders" className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-950 transition hover:bg-slate-100">
                  Open orders
                </Link>
              </div>
              <div className="mt-6 flex h-40 items-end gap-3">
                {dashboard.revenueSeries.map((day) => {
                  const maxOrders = Math.max(1, ...dashboard.revenueSeries.map((item) => item.orders));
                  return (
                    <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-28 w-full items-end">
                        <div
                          className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#fbbf24_0%,#fb7185_100%)] transition-all duration-700 hover:opacity-90"
                          style={{ height: `${(day.orders / maxOrders) * 100}%`, minHeight: day.orders ? "20%" : "10%" }}
                          title={`${day.label}: ${day.orders} orders`}
                        />
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-300">{day.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricChip icon={FiPackage} label="Products" value={formatCompact(dashboard.totalProducts)} tone="border-rose-100 bg-[linear-gradient(135deg,#fff1f2_0%,#ffffff_100%)]" />
          <MetricChip icon={FiClock} label="Pending orders" value={formatCompact(dashboard.pendingOrders)} tone="border-amber-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_100%)]" />
          <MetricChip icon={FiBox} label="Inventory units" value={formatCompact(dashboard.totalInventory)} tone="border-sky-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_100%)]" />
          <MetricChip icon={RiAlarmWarningLine} label="Out of stock" value={formatCompact(dashboard.outOfStockCount)} tone="border-violet-100 bg-[linear-gradient(135deg,#f5f3ff_0%,#ffffff_100%)]" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SectionCard title="Big Trend Analytics" subtitle="Revenue and order motion across the last 7 days.">
            <div className="grid gap-5 xl:grid-cols-2">
              <TrendChart title="Revenue trend" value={formatCurrency(dashboard.revenueSeries.reduce((sum, day) => sum + day.revenue, 0))} points={dashboard.revenueSeries.map((item) => item.revenue)} labels={dashboard.revenueSeries.map((item) => item.label)} stroke="#fb7185" fill="#fb7185" footer="Use this curve to understand short-term earning movement." />
              <TrendChart title="Order velocity" value={formatCompact(dashboard.revenueSeries.reduce((sum, day) => sum + day.orders, 0))} points={dashboard.revenueSeries.map((item) => item.orders)} labels={dashboard.revenueSeries.map((item) => item.label)} stroke="#0ea5e9" fill="#0ea5e9" footer="Daily order frequency makes it easy to spot active selling days." />
            </div>
          </SectionCard>

          <SectionCard title="Category Mix Chart" subtitle="Top active product groups by catalog share." action={<div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Live catalog split</div>}>
            {dashboard.donutData.length ? <DonutChart data={dashboard.donutData} /> : <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-8 text-center"><FiShoppingBag className="mx-auto text-4xl text-slate-400" /><p className="mt-3 text-lg font-bold text-slate-900">No product data yet</p><p className="mt-1 text-sm text-slate-500">Add products to see category analytics in chart format.</p></div>}
          </SectionCard>
        </div>
        <SectionCard
          title="User Vs Vendor Analytics"
          subtitle="Platform audience comparison with hover-friendly distribution."
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[26px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    Audience totals
                  </p>
                  <h3 className="mt-2 text-3xl font-black text-slate-950">
                    {formatCompact(
                      dashboard.summary.totalUsers +
                        dashboard.summary.totalVendors
                    )}
                  </h3>
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  Hover-ready blocks
                </div>
              </div>
              <div className="space-y-4">
                {dashboard.audienceSeries.map((item) => {
                  const totalAudience = Math.max(
                    dashboard.summary.totalUsers +
                      dashboard.summary.totalVendors,
                    1
                  );
                  return (
                    <div
                      key={item.label}
                      className="rounded-[22px] border border-slate-100 bg-slate-50/80 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <p className="font-semibold text-slate-900">
                            {item.label}
                          </p>
                        </div>
                        <p className="text-lg font-black text-slate-950">
                          {formatCompact(item.value)}
                        </p>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${(item.value / totalAudience) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Last 30 days: {formatCompact(item.recent)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-100 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_45%,#0ea5e9_100%)] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Community growth chart
                  </p>
                  <h3 className="mt-2 text-3xl font-black">
                    Users & Vendors
                  </h3>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                  Live summary
                </div>
              </div>
              <div className="mt-8 flex h-56 items-end gap-8">
                {dashboard.audienceSeries.map((item) => {
                  const maxAudience = Math.max(
                    ...dashboard.audienceSeries.map((entry) => entry.value),
                    1
                  );
                  return (
                    <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
                      <div className="w-full text-center text-sm font-semibold text-slate-200">
                        {formatCompact(item.value)}
                      </div>
                      <div className="flex h-40 w-full items-end">
                        <div
                          className="w-full rounded-t-[22px] shadow-[0_20px_40px_rgba(15,23,42,0.25)] transition-all duration-700 hover:opacity-90"
                          style={{
                            height: `${(item.value / maxAudience) * 100}%`,
                            minHeight: "24%",
                            background: `linear-gradient(180deg, ${item.color} 0%, rgba(255,255,255,0.8) 180%)`,
                          }}
                          title={`${item.label}: ${item.value} | Last 30 days: ${item.recent}`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-white">{item.label}</p>
                        <p className="text-xs text-slate-200">
                          +{formatCompact(item.recent)} recent
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>
        <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
          <SectionCard title="Status Funnel" subtitle="Small-to-mid level order flow distribution.">
            <div className="space-y-4">
              {dashboard.orderStatusCounts.map((item) => (
                <div
                  key={item.status}
                  className="rounded-[24px] border border-slate-100 bg-slate-50/90 p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white"
                  title={`${item.status}: ${item.count} orders`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold capitalize text-slate-900">{item.status}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusPalette[item.status] || "border-slate-200 bg-slate-100 text-slate-700"}`}>{item.count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#fb7185_100%)]" style={{ width: `${(item.count / dashboard.maxStatusCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Deep Category Analytics" subtitle="Bigger view of count, inventory, value and pricing strength per category.">
            <div className="space-y-4">
              {dashboard.categories.map((category) => (
                <Link key={category.label} to={category.href} className="block rounded-[26px] border border-slate-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-5 transition hover:border-slate-200 hover:shadow-sm">
                  <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr] xl:items-center">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.stroke }} />
                          <p className="text-lg font-black text-slate-950">{category.label}</p>
                        </div>
                        <FiArrowUpRight className="text-slate-400" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Items</p><p className="mt-2 text-lg font-black text-slate-950">{category.count}</p></div>
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Stock</p><p className="mt-2 text-lg font-black text-slate-950">{formatCompact(category.inventory)}</p></div>
                        <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Avg price</p><p className="mt-2 text-lg font-black text-slate-950">{formatCurrency(category.averageTicket)}</p></div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">Catalog share</span><span className="font-bold text-slate-900">{category.count}</span></div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${(category.count / dashboard.maxCategoryCount) * 100}%`, backgroundColor: category.stroke }} /></div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700">Inventory value</span><span className="font-bold text-slate-900">{formatCurrency(category.stockValue)}</span></div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#38bdf8_100%)]" style={{ width: `${(category.stockValue / Math.max(dashboard.totalStockValue, 1)) * 100}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <SectionCard title="Stock Pressure" subtitle="Small-level restock warning system for fast action.">
            {dashboard.lowStockItems.length ? (
              <div className="space-y-3">
                {dashboard.lowStockItems.map((item) => (
                  <div key={item._id} className="rounded-[22px] border border-rose-100 bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_100%)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.categoryLabel}</p>
                      </div>
                      <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-600">{item.inStock} left</div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#fb7185_0%,#f97316_100%)]" style={{ width: `${(Number(item.inStock) / 5) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-8 text-center"><MdOutlineInventory2 className="mx-auto text-4xl text-emerald-600" /><p className="mt-3 text-lg font-bold text-emerald-900">Inventory looks stable</p><p className="mt-1 text-sm text-emerald-700">No urgent low-stock pressure across your current catalog.</p></div>
            )}
          </SectionCard>

          <SectionCard title="Recent Order Analytics" subtitle="Latest order list with amount and status signals." action={<Link to="/orders" className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700">View all</Link>}>
            {dashboard.recentOrders.length ? (
              <div className="space-y-3">
                {dashboard.recentOrders.map((order) => (
                  <Link key={order._id} to={`/order/${order._id}`} className="grid gap-4 rounded-[24px] border border-slate-100 bg-slate-50/80 p-4 transition hover:border-slate-200 hover:bg-white md:grid-cols-[1fr_auto_auto]">
                    <div><p className="font-semibold text-slate-950">Order #{order.orderId || order._id?.slice(-6)}</p><p className="mt-1 text-sm text-slate-500">{shortDate(order.createdAt)} · {order.items?.length || 0} items</p></div>
                    <div className="text-left md:text-right"><p className="text-lg font-black text-slate-950">{formatCurrency(order.totalAmount)}</p><p className="text-xs text-slate-500">{order.paymentMethod || "payment pending"}</p></div>
                    <div className="flex items-center md:justify-end"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusPalette[order.orderStatus] || "border-slate-200 bg-slate-100 text-slate-700"}`}>{(order.orderStatus || "pending").replace(/_/g, " ")}</span></div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-8 text-center"><FiShoppingBag className="mx-auto text-4xl text-slate-400" /><p className="mt-3 text-lg font-bold text-slate-900">No orders yet</p><p className="mt-1 text-sm text-slate-500">Charts will become richer as customer orders start arriving.</p></div>
            )}
          </SectionCard>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <SectionCard title="Big Picture" subtitle="High-value business metrics.">
            <div className="space-y-4">
              <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Avg order value</p><p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(dashboard.averageOrderValue)}</p></div>
              <div className="rounded-[22px] bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Stock valuation</p><p className="mt-3 text-3xl font-black text-slate-950">{formatCurrency(dashboard.totalStockValue)}</p></div>
            </div>
          </SectionCard>

          <SectionCard title="Focus Actions" subtitle="Jump straight into key areas.">
            <div className="grid gap-3">
              <Link to="/fashion-products" className="rounded-[22px] bg-[linear-gradient(135deg,#fb7185_0%,#f97316_100%)] px-5 py-4 font-semibold text-white transition hover:opacity-90">Open Fashion Dashboard</Link>
              <Link to="/electronic-products" className="rounded-[22px] bg-[linear-gradient(135deg,#0ea5e9_0%,#06b6d4_100%)] px-5 py-4 font-semibold text-white transition hover:opacity-90">Open Electronics Dashboard</Link>
              <Link to="/orders" className="rounded-[22px] bg-slate-900 px-5 py-4 font-semibold text-white transition hover:bg-slate-700">Manage Order Flow</Link>
            </div>
          </SectionCard>

          <SectionCard title="Growth Signal" subtitle="What the panel is telling you right now.">
            <div className="rounded-[24px] bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#eff6ff_100%)] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-sm"><FiTrendingUp className="text-xl text-slate-900" /></div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Suggested next move</p>
                  <p className="text-lg font-black text-slate-950">Balance catalog depth and order conversion</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">Your strongest category is <span className="font-bold text-slate-900">{dashboard.topCategory?.label || "not available"}</span>. Keep it growing, but use slower categories and low-stock alerts to improve catalog breadth and avoid missed sales.</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default Home;
