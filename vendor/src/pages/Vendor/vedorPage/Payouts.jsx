import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiCreditCard, FiDownload, FiSend } from "react-icons/fi";
import {
  useGetVendorPayoutRequestsQuery,
  useGetVendorPayoutSummaryQuery,
  useRequestVendorPayoutMutation,
} from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

const BASE_URL = import.meta.env.VITE_API_URL;

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const statusTone = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const Payouts = () => {
  const { data: summaryData, isLoading: isSummaryLoading, isError, refetch } =
    useGetVendorPayoutSummaryQuery();
  const { data: payoutData, isLoading: isPayoutsLoading } =
    useGetVendorPayoutRequestsQuery();
  const [requestVendorPayout, { isLoading: isSubmitting }] =
    useRequestVendorPayoutMutation();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const summary = summaryData?.summary || {};
  const payoutRequests = useMemo(
    () => payoutData?.payoutRequests || [],
    [payoutData?.payoutRequests],
  );

  const handleRequestPayout = async (event) => {
    event.preventDefault();

    try {
      await requestVendorPayout({
        amount: Number(amount),
        notes,
      }).unwrap();
      toast.success("Payout request submitted");
      setAmount("");
      setNotes("");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to submit payout request");
    }
  };

  const handleExportPayouts = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/vendor/payouts/export`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export payouts");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `vendor-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (_error) {
      toast.error("Failed to export payout report");
    }
  };

  if (isSummaryLoading || isPayoutsLoading) {
    return <PageLoader message="Loading payout desk..." />;
  }

  if (isError) {
    return <ErrorMessage onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Finance Desk
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Vendor Payouts</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Delivered revenue, locked payout requests, aur available withdrawal balance yahan
              track kar sakte ho.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPayouts}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <FiDownload size={16} />
            Export Payout CSV
          </button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Available", value: formatCurrency(summary.availablePayoutAmount) },
            { label: "Delivered Revenue", value: formatCurrency(summary.deliveredRevenue) },
            { label: "Locked Requests", value: formatCurrency(summary.lockedPayoutAmount) },
            { label: "Paid Out", value: formatCurrency(summary.paidOutAmount) },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {card.label}
              </p>
              <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <FiCreditCard size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Request Payout</h2>
              <p className="text-sm text-slate-500">Submit withdrawal against available balance.</p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleRequestPayout}>
            <div>
              <label className="text-sm font-semibold text-slate-700">Amount</label>
              <input
                type="number"
                min="1"
                max={Math.max(0, Number(summary.availablePayoutAmount || 0))}
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Enter payout amount"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Notes</label>
              <textarea
                rows="4"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional settlement note"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !Number(amount)}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiSend size={16} />
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-bold text-slate-950">Payout History</h2>
          <p className="mt-2 text-sm text-slate-500">
            Recent payout requests aur unka current finance status.
          </p>

          <div className="mt-6 space-y-3">
            {payoutRequests.length ? (
              payoutRequests.map((request) => (
                <div
                  key={request._id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black text-slate-950">
                        {formatCurrency(request.requestedAmount)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                        statusTone[request.status] || "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>
                  {request.notes ? (
                    <p className="mt-3 text-sm text-slate-600">{request.notes}</p>
                  ) : null}
                  {request.processedNotes ? (
                    <p className="mt-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-700">Admin note:</span>{" "}
                      {request.processedNotes}
                    </p>
                  ) : null}
                  {request.processedAt ? (
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                      Processed {new Date(request.processedAt).toLocaleString("en-IN")}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Abhi tak koi payout request submit nahi hua hai.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Payouts;
