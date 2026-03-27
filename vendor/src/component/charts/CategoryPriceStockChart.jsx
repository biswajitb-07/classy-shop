// File guide: CategoryPriceStockChart source file.
// This file belongs to the vendor app architecture and has a focused responsibility within its module/folder.
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartTooltip from "./ChartTooltip";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: value >= 100000 ? "compact" : "standard",
  }).format(value || 0);

const formatCompact = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const CategoryPriceStockChart = ({ data, dark = false, height = 320 }) => {
  const chartData = data.map((item) => ({
    name: item.name,
    stock: item.stock,
    avgPrice: item.avgPrice,
    items: item.items,
    value: item.value,
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 12, right: 10, left: 0, bottom: 8 }}
        >
          <CartesianGrid
            strokeDasharray="4 4"
            stroke={dark ? "#334155" : "#e2e8f0"}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{
              fill: dark ? "#cbd5e1" : "#475569",
              fontSize: 12,
              fontWeight: 600,
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={formatCompact}
            tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={formatCompact}
            tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            cursor={{
              stroke: dark ? "rgba(148,163,184,0.28)" : "rgba(15,23,42,0.18)",
              strokeDasharray: "4 4",
            }}
            content={
              <ChartTooltip
                dark={dark}
                formatter={(_value, name, payload) => {
                  if (name === "Avg price") {
                    return `${formatCurrency(payload.avgPrice)} | ${payload.items} items`;
                  }
                  return `${formatCompact(payload.stock)} stock | ${formatCurrency(
                    payload.value
                  )} value`;
                }}
              />
            }
          />
          <Bar
            yAxisId="left"
            dataKey="stock"
            name="Stock"
            radius={[14, 14, 6, 6]}
            maxBarSize={54}
            fill={dark ? "#38bdf8" : "#0ea5e9"}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgPrice"
            name="Avg price"
            stroke={dark ? "#fb7185" : "#e11d48"}
            strokeWidth={3}
            dot={{ r: 4, fill: dark ? "#fda4af" : "#f43f5e" }}
            activeDot={{
              r: 6,
              fill: dark ? "#fda4af" : "#f43f5e",
              stroke: dark ? "#0f172a" : "#ffffff",
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryPriceStockChart;
