import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CreditCard, MapPin } from "lucide-react";
import { useGetAssignedOrdersQuery } from "../../../features/api/orderApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { getDeliveryOrderPath } from "../../../utils/orderRouting";

const ITEMS_PER_PAGE = 6;

const parsePositivePage = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatStatus = (value) =>
  String(value || "pending")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const Orders = () => {
  const { data, isLoading, isError, refetch } = useGetAssignedOrdersQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const orders = data?.orders || [];
  const rawPage = parsePositivePage(searchParams.get("page"));

  const totalPages = Math.max(1, Math.ceil(orders.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(rawPage, totalPages);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== rawPage) {
      const next = new URLSearchParams(searchParams);
      if (currentPage <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(currentPage));
      }
      setSearchParams(next, { replace: true });
    }
  }, [currentPage, rawPage, searchParams, setSearchParams]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, orders]);

  const handlePageChange = (page) => {
    const next = new URLSearchParams(searchParams);
    if (page <= 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    setSearchParams(next, { replace: true });
  };

  if (isLoading) {
    return <PageLoader message="Loading assigned orders..." />;
  }

  if (isError) {
    return (
      <ErrorMessage
        message="Assigned orders load nahi ho pa rahe."
        onRetry={refetch}
      />
    );
  }

  const showingFrom = orders.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, orders.length);

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-slate-800 bg-slate-950/70 p-5 shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Orders
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">Assigned Orders</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Assigned deliveries ko yahin se track karo, customer destination dekho, aur next action ke liye order detail open karo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Total Assigned", value: orders.length },
              {
                label: "Active Route",
                value: orders.filter((order) => ["shipped", "out_for_delivery"].includes(order.orderStatus)).length,
              },
              {
                label: "Delivered",
                value: orders.filter((order) => order.orderStatus === "delivered").length,
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-3 text-2xl font-bold text-white">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4">
        {paginatedOrders.length ? (
          paginatedOrders.map((order) => (
            <Link
              key={order._id}
              to={getDeliveryOrderPath(order, { search: searchParams.toString() })}
              className="rounded-[1.5rem] border border-slate-800 bg-slate-900/70 p-5 transition hover:border-indigo-500/30 hover:bg-slate-900"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      Order #{order.orderId}
                    </h2>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                      {formatStatus(order.orderStatus)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {order.shippingAddress?.fullName} • {formatDate(order.createdAt)}
                  </p>
                  <p className="mt-3 flex items-start gap-2 text-sm text-slate-400">
                    <MapPin size={15} className="mt-0.5 shrink-0" />
                    <span>
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                    </span>
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
                  <div className="rounded-2xl bg-slate-950 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                      Total
                    </p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {formatCurrency(order.totalAmount)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                      Items
                    </p>
                    <p className="mt-2 font-semibold text-slate-100">
                      {order.items?.length || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-950 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-600">
                      Payment
                    </p>
                    <p className="mt-2 flex items-center gap-2 font-semibold text-slate-100">
                      <CreditCard size={14} />
                      {String(order.paymentMethod || "").toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end">
                <span className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                  View details
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-slate-700 bg-slate-900/40 px-5 py-14 text-center text-sm text-slate-500">
            Abhi tak aapko koi order assign nahi hua hai.
          </div>
        )}
      </div>

      {orders.length > ITEMS_PER_PAGE ? (
        <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/70 px-5 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Showing {showingFrom}-{showingTo} of {orders.length} assigned orders
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={14} />
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`h-10 min-w-10 rounded-xl px-3 text-sm font-semibold transition ${
                    page === currentPage
                      ? "bg-blue-700 text-slate-950"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default Orders;
