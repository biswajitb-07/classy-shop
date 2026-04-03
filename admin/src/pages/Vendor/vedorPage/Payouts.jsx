import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  useApproveDeliveryPayoutMutation,
  useGetAllVendorPayoutRequestsQuery,
  useGetDeliveryPayoutDeskQuery,
  useUpdateDeliveryPayoutStatusMutation,
  useUpdateVendorPayoutStatusMutation,
} from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const statusClassMap = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-sky-100 text-sky-700 border-sky-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const Payouts = () => {
  const { data: vendorPayoutData, isLoading: isVendorPayoutLoading } =
    useGetAllVendorPayoutRequestsQuery();
  const { data: deliveryPayoutData, isLoading: isDeliveryPayoutLoading } =
    useGetDeliveryPayoutDeskQuery();
  const [updateVendorPayoutStatus, { isLoading: isUpdatingVendorStatus }] =
    useUpdateVendorPayoutStatusMutation();
  const [approveDeliveryPayout, { isLoading: isApprovingDelivery }] =
    useApproveDeliveryPayoutMutation();
  const [updateDeliveryPayoutStatus, { isLoading: isUpdatingDeliveryStatus }] =
    useUpdateDeliveryPayoutStatusMutation();
  const [processingNotes, setProcessingNotes] = useState({});

  const vendorPayoutRequests = useMemo(
    () => vendorPayoutData?.payoutRequests || [],
    [vendorPayoutData?.payoutRequests]
  );
  const deliveryQueue = useMemo(
    () => deliveryPayoutData?.queue || [],
    [deliveryPayoutData?.queue]
  );
  const deliveryHistory = useMemo(
    () => deliveryPayoutData?.payoutHistory || [],
    [deliveryPayoutData?.payoutHistory]
  );
  const deliverySummary = deliveryPayoutData?.summary || {};

  const handleVendorStatus = async (payoutId, status) => {
    try {
      await updateVendorPayoutStatus({
        payoutId,
        status,
        processedNotes: processingNotes[payoutId] || "",
      }).unwrap();
      toast.success(`Vendor payout ${status} successfully`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update vendor payout");
    }
  };

  const handleApproveDelivery = async (deliveryPartnerId) => {
    try {
      await approveDeliveryPayout({
        deliveryPartnerId,
        processedNotes: processingNotes[`delivery-${deliveryPartnerId}`] || "",
      }).unwrap();
      toast.success("Delivery payout approved successfully");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to approve delivery payout");
    }
  };

  const handleDeliveryStatus = async (payoutId, status) => {
    try {
      await updateDeliveryPayoutStatus({
        payoutId,
        status,
        processedNotes: processingNotes[`history-${payoutId}`] || "",
      }).unwrap();
      toast.success(`Delivery payout ${status} successfully`);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update delivery payout");
    }
  };

  if (isVendorPayoutLoading || isDeliveryPayoutLoading) {
    return <PageLoader message="Loading admin payout desk..." />;
  }

  return (
    <section className="space-y-6 pb-8">
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">
              Admin Finance Desk
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Vendor and delivery payouts</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Admin side par ab payout create/request form hata diya gaya hai. Yahan sirf vendor requests review hote hain aur delivery partners ke payable balances approve ya paid mark kiye jaate hain.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Vendor Requests",
                value: vendorPayoutRequests.length,
              },
              {
                label: "Vendor Pending",
                value: vendorPayoutRequests.filter((item) => item.status === "pending").length,
              },
              {
                label: "Delivery Payable",
                value: formatCurrency(deliverySummary.totalPayableAmount),
              },
              {
                label: "Delivery Paid",
                value: formatCurrency(deliverySummary.totalPaidAmount),
              },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Vendor payout approval queue</h2>
            <p className="mt-1 text-sm text-slate-500">Normal vendors ke payout requests yahan review honge.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {vendorPayoutRequests.length} requests
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {vendorPayoutRequests.length ? (
            vendorPayoutRequests.map((request) => (
              <article key={request._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-950">{request.vendorId?.name || "Vendor"}</h3>
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassMap[request.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{request.vendorId?.email || "Vendor email unavailable"}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Requested</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(request.requestedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Available At Request</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(request.availableBalanceAtRequest)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Requested On</p>
                        <p className="mt-1 text-base font-bold text-slate-900">{new Date(request.createdAt).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-lg space-y-3">
                    <textarea
                      value={processingNotes[request._id] || ""}
                      onChange={(event) =>
                        setProcessingNotes((prev) => ({
                          ...prev,
                          [request._id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Finance notes"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-sky-300"
                    />
                    <div className="flex flex-wrap gap-3">
                      {request.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleVendorStatus(request._id, "approved")}
                            disabled={isUpdatingVendorStatus}
                            className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                          >
                            {isUpdatingVendorStatus ? <AuthButtonLoader color="#ffffff" size={16} /> : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVendorStatus(request._id, "rejected")}
                            disabled={isUpdatingVendorStatus}
                            className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {request.status === "approved" ? (
                        <button
                          type="button"
                          onClick={() => handleVendorStatus(request._id, "paid")}
                          disabled={isUpdatingVendorStatus}
                          className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Mark Paid
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
              Abhi vendor payout approval queue empty hai.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Delivery payout desk</h2>
            <p className="mt-1 text-sm text-slate-500">Completed deliveries ke basis par payable balances yahan auto-calculate hote hain.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
            {deliveryQueue.length} partners payable
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {deliveryQueue.length ? (
            deliveryQueue.map((entry) => {
              const key = `delivery-${entry.deliveryPartner?._id}`;
              return (
                <article key={entry.deliveryPartner?._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{entry.deliveryPartner?.name || "Delivery Partner"}</h3>
                      <p className="mt-2 text-sm text-slate-500">{entry.deliveryPartner?.email || "Email unavailable"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Completed Orders</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{entry.completedOrdersCount}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Per Order</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(entry.perOrderAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Payable Amount</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(entry.payoutAmount)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-lg space-y-3">
                      <textarea
                        value={processingNotes[key] || ""}
                        onChange={(event) =>
                          setProcessingNotes((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Settlement notes"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-sky-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleApproveDelivery(entry.deliveryPartner?._id)}
                        disabled={isApprovingDelivery}
                        className="inline-flex min-w-[12rem] items-center justify-center rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                      >
                        {isApprovingDelivery ? <AuthButtonLoader color="#ffffff" size={16} /> : "Approve payout"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
              Abhi kisi delivery partner ke liye unpaid completed-delivery balance pending nahi hai.
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">Delivery payout history</h3>
              <p className="mt-1 text-sm text-slate-500">Approved aur paid delivery settlements yahan track hongi.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
              {deliveryHistory.length} records
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {deliveryHistory.length ? (
              deliveryHistory.map((record) => (
                <article key={record._id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-bold text-slate-950">{record.deliveryPartnerId?.name || "Delivery Partner"}</h4>
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClassMap[record.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                          {record.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{record.deliveryPartnerId?.email || "Email unavailable"}</p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Orders</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{record.completedOrdersCount}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Amount</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(record.payoutAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Processed On</p>
                          <p className="mt-1 text-base font-bold text-slate-900">{new Date(record.processedAt || record.createdAt).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-full max-w-lg space-y-3">
                      <textarea
                        value={processingNotes[`history-${record._id}`] || record.processedNotes || ""}
                        onChange={(event) =>
                          setProcessingNotes((prev) => ({
                            ...prev,
                            [`history-${record._id}`]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Settlement notes"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-sky-300"
                      />
                      <div className="flex flex-wrap gap-3">
                        {record.status === "approved" ? (
                          <button
                            type="button"
                            onClick={() => handleDeliveryStatus(record._id, "paid")}
                            disabled={isUpdatingDeliveryStatus}
                            className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {isUpdatingDeliveryStatus ? <AuthButtonLoader color="#ffffff" size={16} /> : "Mark Paid"}
                          </button>
                        ) : null}
                        {record.status !== "paid" ? (
                          <button
                            type="button"
                            onClick={() => handleDeliveryStatus(record._id, "rejected")}
                            disabled={isUpdatingDeliveryStatus}
                            className="inline-flex min-w-[10rem] items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Delivery payout history abhi empty hai.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Payouts;
