import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import {
  useCreateDeliveryPartnerMutation,
  useDeleteDeliveryPartnerMutation,
  useGetDeliveryPartnersQuery,
  useToggleDeliveryPartnerBlockMutation,
} from "../../../features/api/authApi";
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
      await createDeliveryPartner(form).unwrap();
      toast.success("Delivery partner created");
      setForm(initialForm);
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create delivery partner");
    }
  };

  const handleToggleBlock = async (deliveryPartner) => {
    try {
      await toggleDeliveryPartnerBlock({
        id: deliveryPartner._id,
        isBlocked: !deliveryPartner.isBlocked,
      }).unwrap();
      toast.success(
        deliveryPartner.isBlocked
          ? "Delivery partner unblocked"
          : "Delivery partner blocked"
      );
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update delivery partner");
    }
  };

  const handleDelete = async (deliveryPartner) => {
    const confirmed = window.confirm(
      `Delete ${deliveryPartner.name}? Active assigned orders hone par delete block hoga.`
    );

    if (!confirmed) return;

    try {
      await deleteDeliveryPartner(deliveryPartner._id).unwrap();
      toast.success("Delivery partner deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete delivery partner");
    }
  };

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load delivery partners"
        onRetry={refetch}
      />
    );
  }

  if (isLoading) {
    return <PageLoader message="Loading delivery partners..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="container px-4 mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Delivery Partners</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage riders and keep delivery operations organized from one place.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Delivery Partner
          </button>
        </div>

        <div className="space-y-4">
          {deliveryPartners.length ? (
            deliveryPartners.map((deliveryPartner) => (
              <div
                key={deliveryPartner._id}
                className="rounded-3xl bg-white p-6 shadow-lg"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        {deliveryPartner.name}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          deliveryPartner.isBlocked
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {deliveryPartner.isBlocked ? "Blocked" : "Active"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          deliveryPartner.isOnline
                            ? "bg-cyan-100 text-cyan-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {deliveryPartner.isOnline ? "Online" : "Offline"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          deliveryPartner.isAvailable
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {deliveryPartner.isAvailable ? "Available" : "Offline"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>
                        Email:{" "}
                        <span className="font-semibold text-gray-800">
                          {deliveryPartner.email}
                        </span>
                      </p>
                      <p>
                        Phone:{" "}
                        <span className="font-semibold text-gray-800">
                          {deliveryPartner.phone || "Not added"}
                        </span>
                      </p>
                      <p>
                        Vehicle:{" "}
                        <span className="font-semibold capitalize text-gray-800">
                          {deliveryPartner.vehicleType}
                        </span>
                      </p>
                      <p>
                        Joined:{" "}
                        <span className="font-semibold text-gray-800">
                          {new Date(deliveryPartner.createdAt).toLocaleDateString(
                            "en-IN"
                          )}
                        </span>
                      </p>
                      <p>
                        Last Seen:{" "}
                        <span className="font-semibold text-gray-800">
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
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleBlock(deliveryPartner)}
                      disabled={isUpdating || isDeleting}
                      className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {deliveryPartner.isBlocked ? "Unblock" : "Block"}
                    </button>
                    <button
                      onClick={() => handleDelete(deliveryPartner)}
                      disabled={isUpdating || isDeleting}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-500 shadow-lg">
              No delivery partners yet. Add your first rider to start assigning
              orders.
            </div>
          )}
        </div>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <div className="relative mx-4 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Add Delivery Partner
                  </h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Rider details add karo, phir usko orders assign kiye ja sakte hain.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6">
                <div className="space-y-4">
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Temporary password"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    required
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Phone number"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    />
                    <select
                      name="vehicleType"
                      value={form.vehicleType}
                      onChange={handleChange}
                      className="delivery-form-select w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    >
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="cycle">Cycle</option>
                      <option value="van">Van</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "Create Delivery Partner"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeliveryPartners;
