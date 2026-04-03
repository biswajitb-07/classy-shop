import { useGetDashboardSummaryQuery, useGetDeliveryPayoutsQuery } from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const statusTone = {
  approved: "bg-sky-500/15 text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
};

const Payouts = () => {
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    refetch: refetchSummary,
  } = useGetDashboardSummaryQuery();
  const {
    data: payoutData,
    isLoading: isPayoutsLoading,
    isError: isPayoutsError,
    refetch: refetchPayouts,
  } = useGetDeliveryPayoutsQuery();

  if (isSummaryLoading || isPayoutsLoading) {
    return <PageLoader message="Loading payout desk..." />;
  }

  if (isSummaryError || isPayoutsError) {
    return (
      <ErrorMessage
        message="Payout details load nahi ho pa rahe."
        onRetry={() => {
          refetchSummary();
          refetchPayouts();
        }}
      />
    );
  }

  const payoutSummary = summaryData?.summary?.payoutSummary || {};
  const payouts = payoutData?.payouts || [];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.92)_0%,rgba(2,6,23,0.96)_100%)] p-6 shadow-xl shadow-slate-950/40">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Finance desk</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Payout Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Admin approval aur paid settlement ka latest status yahin track hoga.
            </p>
          </div>
          <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-200/80">
              Total Approved
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {formatCurrency(payoutSummary.approvedAmount || 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[1.75rem] border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20"
          >
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
            <p className={`mt-4 text-3xl font-black ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Payout history</h2>
            <p className="mt-1 text-sm text-slate-400">
              Approved, paid, aur rejected payout requests ki full list.
            </p>
          </div>
          <div className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
            {payoutSummary.totalPayouts || payouts.length} records
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {payouts.length ? (
            payouts.map((entry) => (
              <div
                key={entry._id}
                className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-white">
                      {formatCurrency(entry.payoutAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Created {new Date(entry.createdAt).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Completed deliveries: {entry.completedOrdersCount || 0}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                      statusTone[entry.status] || "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                {entry.processedNotes ? (
                  <p className="mt-3 text-sm leading-6 text-slate-400">{entry.processedNotes}</p>
                ) : null}
                {entry.processedAt ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-slate-500">
                    Processed {new Date(entry.processedAt).toLocaleString("en-IN")}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-700 px-5 py-10 text-center text-sm text-slate-500">
              Abhi tak koi payout record nahi hai.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Payouts;
