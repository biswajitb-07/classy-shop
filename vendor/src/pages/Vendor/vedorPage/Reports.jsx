import { FiBarChart2, FiDownload, FiFileText } from "react-icons/fi";
import toast from "react-hot-toast";
import { useGetVendorPayoutSummaryQuery } from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

const BASE_URL = import.meta.env.VITE_API_URL;

const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const Reports = () => {
  const { data, isLoading, isError, refetch } = useGetVendorPayoutSummaryQuery();
  const summary = data?.summary || {};

  const handleDownload = async (endpoint, fileName) => {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/vendor/${endpoint}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Report export failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (_error) {
      toast.error("Failed to export report");
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading reports workspace..." />;
  }

  if (isError) {
    return <ErrorMessage onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
            <FiBarChart2 size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Reports Hub
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Export Reports</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Gross Revenue", value: formatCurrency(summary.grossRevenue) },
            { label: "Delivered Revenue", value: formatCurrency(summary.deliveredRevenue) },
            { label: "Pending Revenue", value: formatCurrency(summary.pendingRevenue) },
            { label: "Total Orders", value: Number(summary.totalOrders || 0).toLocaleString("en-IN") },
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

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          {
            title: "Orders Report",
            description: "Order-wise CSV with status, payment, customer, item count, and vendor revenue.",
            endpoint: "reports/orders/export",
            fileName: `vendor-orders-report-${new Date().toISOString().slice(0, 10)}.csv`,
          },
          {
            title: "Summary Report",
            description: "Finance summary CSV with delivered, pending, returned, and available payout values.",
            endpoint: "reports/summary/export",
            fileName: `vendor-summary-report-${new Date().toISOString().slice(0, 10)}.csv`,
          },
          {
            title: "Payout Report",
            description: "All payout requests with request notes, request date, and current finance status.",
            endpoint: "payouts/export",
            fileName: `vendor-payouts-${new Date().toISOString().slice(0, 10)}.csv`,
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
          >
            <div className="rounded-2xl bg-slate-900 p-3 text-white w-fit">
              <FiFileText size={18} />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
            <button
              type="button"
              onClick={() => handleDownload(card.endpoint, card.fileName)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <FiDownload size={16} />
              Export CSV
            </button>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Reports;
