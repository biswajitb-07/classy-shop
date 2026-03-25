import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const formatAxisCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);

const CategoryInventoryBarChart = ({ data, dark = false, height = 320 }) => {
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.value,
    items: item.items,
    stock: item.stock,
    avgPrice: item.avgPrice,
    fill: item.color,
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke={dark ? "#334155" : "#e2e8f0"}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: dark ? "#cbd5e1" : "#475569", fontSize: 12, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAxisCurrency}
            tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={62}
          />
          <Tooltip
            cursor={{ fill: dark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.05)" }}
            content={
              <ChartTooltip
                dark={dark}
                formatter={(value, _name, payload) =>
                  `${formatCurrency(value)} | ${payload.items} items | ${payload.stock} stock`
                }
              />
            }
          />
          <Bar
            dataKey="value"
            name="Inventory value"
            radius={[16, 16, 6, 6]}
            maxBarSize={74}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryInventoryBarChart;
