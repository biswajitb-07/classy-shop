import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiLock,
  FiShield,
  FiTruck,
  FiTrash2,
  FiUnlock,
  FiUsers,
} from "react-icons/fi";
import { Plus, X } from "lucide-react";
import {
  useCreateDeliveryPartnerMutation,
  useDeleteDeliveryPartnerMutation,
  useGetDeliveryPartnersQuery,
  useToggleDeliveryPartnerBlockMutation,
} from "../../../features/api/authApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";
import { connectVendorSocket } from "../../../lib/socket";

const initialForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  vehicleType: "bike",
};

const DeliveryPartners = () => {
  const { data, isLoading, isError, refetch } = useGetDeliveryPartnersQuery();
  const [createDeliveryPartner, { isLoading: isCreating }] =
    useCreateDeliveryPartnerMutation();
  const [toggleDeliveryPartnerBlock, { isLoading: isUpdating }] =
    useToggleDeliveryPartnerBlockMutation();
  const [deleteDeliveryPartner, { isLoading: isDeleting }] =
    useDeleteDeliveryPartnerMutation();

  const [form, setForm] = useState(initialForm);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [processingPartnerId, setProcessingPartnerId] = useState(null);

  const deliveryPartners = useMemo(
    () => data?.deliveryPartners || [],
    [data?.deliveryPartners]
  );

  useEffect(() => {
    const socket = connectVendorSocket();
    const handlePartnerUpdate = () => refetch();

    socket.on("delivery:partners:update", handlePartnerUpdate);

    return () => {
      socket.off("delivery:partners:update", handlePartnerUpdate);
    };
  }, [refetch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await createDeliveryPartner({
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      }).unwrap();
      toast.success("Delivery partner created");
      setForm(initialForm);
      setIsCreateModalOpen(false);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create delivery partner");
    }
  };

  const handleToggleBlock = async (deliveryPartner) => {
    try {
      setProcessingPartnerId(deliveryPartner._id);
      await toggleDeliveryPartnerBlock({
        id: deliveryPartner._id,
        isBlocked: !deliveryPartner.isBlocked,
      }).unwrap();
      toast.success(
        deliveryPartner.isBlocked
          ? "Delivery partner unblocked"
          : "Delivery partner blocked"
      );
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update delivery partner");
    } finally {
      setProcessingPartnerId(null);
    }
  };

  const handleDelete = async (deliveryPartner) => {
    const confirmed = window.confirm(
      `Delete ${deliveryPartner.name}? Active assigned orders hone par delete block hoga.`
    );

    if (!confirmed) return;

    try {
      setProcessingPartnerId(deliveryPartner._id);
      await deleteDeliveryPartner(deliveryPartner._id).unwrap();
      toast.success("Delivery partner deleted");
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete delivery partner");
    } finally {
      setProcessingPartnerId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <PageLoader message={null} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load delivery partners"
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto mt-4 max-w-7xl">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              <FiTruck size={14} /> Logistics
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Delivery Partners
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Admin community console se riders, availability, aur delivery access ko
              cleanly manage karo.
            </p>
          </div>
          <div className="rounded-[20px] border border-slate-100 bg-white px-5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Total Riders
            </p>
            <p className="mt-1 text-2xl font-black leading-none text-slate-900">
              {deliveryPartners.length}
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to="/community/admins"
            className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
          >
            <FiShield size={16} /> Admin Accounts
          </Link>
          <Link
            to="/community/users"
            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-600 transition hover:bg-sky-50"
          >
            <FiUsers size={16} /> User Data
          </Link>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700"
          >
            <FiTruck size={16} /> Add Delivery Partner
          </button>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-5 font-bold">Partner</th>
                  <th className="px-6 py-5 font-bold">Contact</th>
                  <th className="px-6 py-5 font-bold">Vehicle</th>
                  <th className="px-6 py-5 font-bold">Status</th>
                  <th className="px-6 py-5 font-bold">Last Seen</th>
                  <th className="px-6 py-5 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveryPartners.length ? (
                  deliveryPartners.map((deliveryPartner) => {
                    const isProcessing = processingPartnerId === deliveryPartner._id;

                    return (
                      <tr
                        key={deliveryPartner._id}
                        className="group transition-colors"
                      >
                        <td className="border-l-[3px] border-transparent px-6 py-5 font-semibold text-slate-900 group-hover:border-cyan-400">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-cyan-50 font-bold text-cyan-700 shadow-sm">
                              {(deliveryPartner.name || "D").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {deliveryPartner.name || "Unnamed"}
                              </p>
                              <p className="text-xs text-slate-500">
                                Joined{" "}
                                {new Date(deliveryPartner.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-medium text-slate-800">
                            {deliveryPartner.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {deliveryPartner.phone || "Phone not added"}
                          </p>
                        </td>
                        <td className="px-6 py-5 font-medium capitalize text-slate-700">
                          {deliveryPartner.vehicleType || "bike"}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                deliveryPartner.isBlocked
                                  ? "border-rose-200 bg-rose-50 text-rose-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {deliveryPartner.isBlocked ? "Blocked" : "Active"}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                deliveryPartner.isOnline
                                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {deliveryPartner.isOnline ? "Online" : "Offline"}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                deliveryPartner.isAvailable
                                  ? "border-blue-200 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {deliveryPartner.isAvailable ? "Available" : "Unavailable"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 whitespace-nowrap font-medium text-slate-500">
                          {deliveryPartner.lastSeenAt
                            ? new Date(deliveryPartner.lastSeenAt).toLocaleString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Not available"}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleBlock(deliveryPartner)}
                              disabled={isUpdating || isDeleting || isProcessing}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${
                                deliveryPartner.isBlocked
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-amber-200 text-amber-700 hover:bg-amber-50"
                              }`}
                            >
                              {isProcessing && isUpdating ? (
                                <AuthButtonLoader />
                              ) : deliveryPartner.isBlocked ? (
                                <>
                                  <FiUnlock size={14} /> Unblock
                                </>
                              ) : (
                                <>
                                  <FiLock size={14} /> Block
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(deliveryPartner)}
                              disabled={isUpdating || isDeleting || isProcessing}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                            >
                              {isProcessing && isDeleting ? (
                                <AuthButtonLoader />
                              ) : (
                                <>
                                  <FiTrash2 size={14} /> Delete
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      No delivery partners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Create Delivery Partner
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Rider details add karo, phir usko orders assign kiye ja sakte hain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full name"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400"
                  required
                />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email address"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400"
                  required
                />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Temporary password"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400"
                  required
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400"
                />
                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleChange}
                  className="delivery-form-select rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-cyan-400 md:col-span-2"
                >
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="cycle">Cycle</option>
                  <option value="van">Van</option>
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:opacity-70"
                >
                  {isCreating ? (
                    <>
                      <AuthButtonLoader className="border-white/35 border-t-white" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Delivery Partner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DeliveryPartners;
