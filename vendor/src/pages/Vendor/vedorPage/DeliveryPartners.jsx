import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useCreateDeliveryPartnerMutation,
  useGetDeliveryPartnersQuery,
  useToggleDeliveryPartnerBlockMutation,
} from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

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
  const [form, setForm] = useState(initialForm);

  const deliveryPartners = useMemo(
    () => data?.deliveryPartners || [],
    [data?.deliveryPartners]
  );

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Delivery Partners</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create riders and manage who can receive assigned orders.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <form
              onSubmit={handleSubmit}
              className="rounded-3xl bg-white p-6 shadow-lg"
            >
              <h2 className="text-lg font-bold text-gray-800">
                Add Delivery Partner
              </h2>

              <div className="mt-5 space-y-4">
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
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                >
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="cycle">Cycle</option>
                  <option value="van">Van</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create Delivery Partner"}
              </button>
            </form>
          </div>

          <div className="space-y-4 lg:col-span-3">
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
                            deliveryPartner.isAvailable
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {deliveryPartner.isAvailable ? "Available" : "Offline"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
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
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleBlock(deliveryPartner)}
                      disabled={isUpdating}
                      className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {deliveryPartner.isBlocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-lg">
                No delivery partners yet. Add your first rider to start
                assigning orders.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPartners;
