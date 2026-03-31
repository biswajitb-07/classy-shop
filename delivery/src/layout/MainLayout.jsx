import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Bike, Home, LogOut, PackageSearch, UserCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  useLogoutUserMutation,
  useToggleAvailabilityMutation,
} from "../features/api/authApi";

const navigationItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/orders", label: "Assigned Orders", icon: PackageSearch },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const { deliveryPartner } = useSelector((state) => state.auth);
  const [logoutUser, { isLoading: isLoggingOut }] = useLogoutUserMutation();
  const [toggleAvailability, { isLoading: isToggling }] =
    useToggleAvailabilityMutation();

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
      toast.success("Logged out");
      navigate("/login");
    } catch (_error) {
      toast.error("Failed to logout");
    }
  };

  const handleAvailabilityToggle = async () => {
    try {
      await toggleAvailability(!deliveryPartner?.isAvailable).unwrap();
      toast.success(
        !deliveryPartner?.isAvailable ? "You are online now" : "You are offline now"
      );
    } catch (_error) {
      toast.error("Failed to update availability");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-900/90 px-5 py-6 lg:border-b-0 lg:border-r">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-900/50">
              <Bike size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Classy Shop
              </p>
              <h1 className="text-lg font-semibold">Delivery Hub</h1>
            </div>
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-medium text-slate-300">
              {deliveryPartner?.name || "Delivery Partner"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {deliveryPartner?.vehicleType || "Rider"}
            </p>
            <button
              onClick={handleAvailabilityToggle}
              disabled={isToggling}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                deliveryPartner?.isAvailable
                  ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {isToggling
                ? "Updating..."
                : deliveryPartner?.isAvailable
                  ? "Available for delivery"
                  : "Currently offline"}
            </button>
          </div>

          <nav className="mt-8 space-y-2">
            {navigationItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-950/40"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut size={16} />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <div className="bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(180deg,_#020617,_#0f172a)]">
          <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/70 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  Delivery Dashboard
                </p>
                <h2 className="text-xl font-semibold text-white">
                  Manage assigned orders faster
                </h2>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm text-slate-300">
                {deliveryPartner?.email || "No email"}
              </div>
            </div>
          </header>

          <main className="px-5 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
