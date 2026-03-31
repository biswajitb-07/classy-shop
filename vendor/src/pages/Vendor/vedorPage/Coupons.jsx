import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";
import {
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useGetCouponsQuery,
  useToggleCouponStatusMutation,
} from "../../../features/api/authApi";
import PageLoader from "../../../component/Loader/PageLoader";
import ErrorMessage from "../../../component/error/ErrorMessage";

const initialForm = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountAmount: "",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
};

const formatMoney = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const Coupons = () => {
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetCouponsQuery();
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [toggleCouponStatus, { isLoading: isToggling }] =
    useToggleCouponStatusMutation();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();

  const [form, setForm] = useState(initialForm);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const coupons = useMemo(() => data?.coupons || [], [data?.coupons]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await createCoupon({
        ...form,
        code: form.code.trim().toUpperCase(),
      }).unwrap();
      toast.success("Coupon created");
      setForm(initialForm);
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || "Failed to create coupon");
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleCouponStatus(id).unwrap();
      toast.success("Coupon updated");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update coupon");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCoupon(id).unwrap();
      toast.success("Coupon deleted");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete coupon");
    }
  };

  if (isError) {
    return <ErrorMessage title="Failed to load coupons" onRetry={refetch} />;
  }

  if (isLoading) {
    return <PageLoader message="Loading coupons..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="container px-4 mx-auto">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Coupons</h1>
            <p className="mt-2 text-sm text-gray-500">
              View and manage all discount codes from one clean dashboard.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Coupon
          </button>
        </div>

        <div className="space-y-4">
          {coupons.length ? (
            coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="rounded-3xl bg-white p-6 shadow-lg"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-800">
                        {coupon.code}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          coupon.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {coupon.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {coupon.title}
                    </p>
                    {coupon.description ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {coupon.description}
                      </p>
                    ) : null}
                    <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
                      <p>
                        Discount:{" "}
                        <span className="font-semibold text-gray-800">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : formatMoney(coupon.discountValue)}
                        </span>
                      </p>
                      <p>
                        Min order:{" "}
                        <span className="font-semibold text-gray-800">
                          {formatMoney(coupon.minOrderAmount)}
                        </span>
                      </p>
                      <p>
                        Max discount:{" "}
                        <span className="font-semibold text-gray-800">
                          {coupon.maxDiscountAmount
                            ? formatMoney(coupon.maxDiscountAmount)
                            : "No cap"}
                        </span>
                      </p>
                      <p>
                        Usage:{" "}
                        <span className="font-semibold text-gray-800">
                          {coupon.usedCount}
                          {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleToggle(coupon._id)}
                      disabled={isToggling}
                      className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-60"
                    >
                      {coupon.isActive ? "Disable" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon._id)}
                      disabled={isDeleting}
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
              No coupons yet. Create your first discount code.
            </div>
          )}
        </div>

        {isCreateModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <div className="relative w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Create Coupon</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    New offer add karo aur checkout discounts ko manage karo.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="max-h-[calc(92vh-88px)] overflow-y-auto px-4 py-4 sm:px-6"
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="code"
                      value={form.code}
                      onChange={handleChange}
                      placeholder="SAVE10"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                      required
                    />
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Summer Sale"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                      required
                    />
                  </div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="10% off on all orders above Rs 999"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select
                      name="discountType"
                      value={form.discountType}
                      onChange={handleChange}
                      className="vendor-dark-select w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                    <input
                      name="discountValue"
                      type="number"
                      min="1"
                      value={form.discountValue}
                      onChange={handleChange}
                      placeholder={form.discountType === "percentage" ? "10" : "250"}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="minOrderAmount"
                      type="number"
                      min="0"
                      value={form.minOrderAmount}
                      onChange={handleChange}
                      placeholder="Min order"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    />
                    <input
                      name="maxDiscountAmount"
                      type="number"
                      min="0"
                      value={form.maxDiscountAmount}
                      onChange={handleChange}
                      placeholder="Max discount"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      name="usageLimit"
                      type="number"
                      min="1"
                      value={form.usageLimit}
                      onChange={handleChange}
                      placeholder="Usage limit"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    />
                    <input
                      name="startsAt"
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <input
                    name="expiresAt"
                    type="datetime-local"
                    value={form.expiresAt}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
                  >
                    {isCreating ? "Creating..." : "Create Coupon"}
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

export default Coupons;
