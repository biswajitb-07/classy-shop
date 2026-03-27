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

const STATUS_COLORS = {
  pending: "#f59e0b",
  processing: "#38bdf8",
  shipped: "#8b5cf6",
  out_for_delivery: "#f97316",
  delivered: "#22c55e",
  cancelled: "#f43f5e",
};

const StatusFunnelChart = ({ data, dark = false, height = 320 }) => {
  const chartData = data.map((item) => ({
    name: (item.status || "pending").replace(/_/g, " "),
    value: item.count,
    fill: STATUS_COLORS[item.status] || "#94a3b8",
  }));

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 12, right: 12, left: -12, bottom: 8 }}>
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
            tick={{ fill: dark ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: dark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.05)" }}
            content={<ChartTooltip dark={dark} formatter={(value) => `${value} orders`} />}
          />
          <Bar dataKey="value" name="Orders" radius={[14, 14, 6, 6]} maxBarSize={68}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatusFunnelChart;
