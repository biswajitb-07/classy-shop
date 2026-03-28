import { FiDownload, FiMail } from "react-icons/fi";
import { HiOutlineBuildingStorefront } from "react-icons/hi2";
import { Link } from "react-router-dom";
import PageLoader from "../../../../component/Loader/PageLoader";
import { useGetNewsletterSubscribersQuery } from "../../../../features/api/authApi";

const BASE_URL = import.meta.env.VITE_API_URL;

const NewsletterSubscribers = () => {
  const { data, isLoading, error } = useGetNewsletterSubscribersQuery();

  const handleExportCsv = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/api/v1/vendor/newsletter/subscribers/export`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export newsletter subscribers");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `newsletter-subscribers-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <PageLoader message="Loading newsletter subscribers..." />
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center font-semibold text-red-500">
        Failed to load newsletter subscribers.
      </div>
    );

  const subscribers = data?.subscribers || [];

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-4 max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
              <FiMail size={14} /> Newsletter
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Newsletter Subscribers
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              View all subscribed emails and export them as CSV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-[20px] border border-slate-100 bg-white px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Total Subscribers
              </p>
              <p className="mt-1 text-2xl font-black leading-none text-slate-900">
                {subscribers.length}
              </p>
            </div>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
            >
              <FiDownload size={16} /> Export CSV
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/community/users"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-600 transition hover:bg-sky-50"
          >
            Users
          </Link>
          <Link
            to="/community/vendors"
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-50"
          >
            <HiOutlineBuildingStorefront size={16} /> Vendor Data
          </Link>
          <Link
            to="/community/newsletter"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700"
          >
            <FiMail size={16} /> Newsletter
          </Link>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-5 font-bold">Email</th>
                  <th className="px-6 py-5 font-bold">Source</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscribers.length > 0 ? (
                  subscribers.map((subscriber) => (
                    <tr key={subscriber._id}>
                      <td className="px-6 py-5 font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                            <FiMail size={16} />
                          </div>
                          <span>{subscriber.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-700">
                        {subscriber.source || "footer-newsletter"}
                      </td>
                      <td className="px-6 py-5">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          {subscriber.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-500">
                        {new Date(subscriber.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                      <FiMail className="mx-auto mb-3 text-4xl text-slate-300" />
                      <p className="text-base font-bold text-slate-800">
                        No newsletter subscribers found
                      </p>
                      <p className="text-sm">
                        Footer newsletter subscriptions will appear here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterSubscribers;
