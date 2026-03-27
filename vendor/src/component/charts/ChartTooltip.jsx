const ChartTooltip = ({ active, payload, label, dark = false, formatter }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={`min-w-[180px] rounded-2xl border px-4 py-3 shadow-xl ${
        dark
          ? "border-slate-700 bg-slate-950/95 text-slate-100"
          : "border-slate-200 bg-white/95 text-slate-900"
      }`}
    >
      {label ? (
        <p className={`mb-2 text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
          {label}
        </p>
      ) : null}
      <div className="space-y-2">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.fill }}
              />
              <span className={dark ? "text-slate-300" : "text-slate-600"}>
                {entry.name}
              </span>
            </div>
            <span className="font-bold">
              {formatter ? formatter(entry.value, entry.name, entry.payload) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartTooltip;
