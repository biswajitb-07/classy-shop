import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartTooltip from "./ChartTooltip";

const formatPercent = (value, total) => `${Math.round((value / Math.max(total, 1)) * 100)}%`;

const CategoryCatalogSharePieChart = ({ data, dark = false, height = 320 }) => {
  const totalItems = data.reduce((sum, item) => sum + item.items, 0);
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.items,
    fill: item.color,
    stock: item.stock,
    avgPrice: item.avgPrice,
  }));

  return (
    <div className="h-full">
      <div className="mb-4 flex justify-end">
        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600"}`}>
          {totalItems} items
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {chartData.map((item) => (
          <div
            key={item.name}
            className={`rounded-2xl border px-4 py-3 ${dark ? "border-slate-700 bg-slate-950/80" : "border-slate-200 bg-white/90"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className={`min-w-0 truncate font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                  {item.name}
                </span>
              </div>
              <span className={`shrink-0 text-sm font-bold ${dark ? "text-slate-200" : "text-slate-700"}`}>
                {formatPercent(item.value, totalItems)}
              </span>
            </div>
            <p className={`mt-2 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {item.value} items • {item.stock} stock
            </p>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[360px]">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Tooltip
              content={
                <ChartTooltip
                  dark={dark}
                  formatter={(value, _name, payload) =>
                    `${value} items | ${formatPercent(value, totalItems)} | Avg ${new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                      maximumFractionDigits: 0,
                    }).format(payload.avgPrice || 0)}`
                  }
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="74%"
              paddingAngle={4}
              stroke={dark ? "#0f172a" : "#ffffff"}
              strokeWidth={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryCatalogSharePieChart;
