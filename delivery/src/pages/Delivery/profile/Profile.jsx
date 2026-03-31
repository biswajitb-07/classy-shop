import { useSelector } from "react-redux";
import { Bike, Mail, Phone, ShieldCheck } from "lucide-react";

const Profile = () => {
  const { deliveryPartner } = useSelector((state) => state.auth);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
          Profile
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white">Delivery Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-indigo-600 text-white shadow-lg shadow-indigo-950/40">
            <Bike size={34} />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-white">
            {deliveryPartner?.name || "Delivery Partner"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {deliveryPartner?.vehicleType || "Vehicle not set"}
          </p>
          <div className="mt-6 inline-flex rounded-full bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            {deliveryPartner?.isAvailable ? "Available" : "Offline"}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-xl font-semibold text-white">Account details</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3 text-slate-400">
                <Mail size={18} />
                Email
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                {deliveryPartner?.email || "Not available"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3 text-slate-400">
                <Phone size={18} />
                Phone
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                {deliveryPartner?.phone || "Not available"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3 text-slate-400">
                <Bike size={18} />
                Vehicle Type
              </div>
              <p className="mt-3 text-sm font-medium capitalize text-white">
                {deliveryPartner?.vehicleType || "bike"}
              </p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3 text-slate-400">
                <ShieldCheck size={18} />
                Status
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                {deliveryPartner?.isBlocked ? "Blocked" : "Active"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
