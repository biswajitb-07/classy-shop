import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Bike,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Truck,
} from "lucide-react";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { useLoginUserMutation } from "../../../features/api/authApi";

const featureCards = [
  {
    icon: Truck,
    title: "Fast status updates",
    description: "Delivery status ko quickly update karo without extra screens.",
  },
  {
    icon: ShieldCheck,
    title: "Separate workspace",
    description: "Vendor panel se alag clean aur secure rider dashboard.",
  },
];

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginUser, { isLoading }] = useLoginUserMutation();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await loginUser(formData).unwrap();
      toast.success(response?.message || "Login successful");
      navigate("/");
    } catch (error) {
      toast.error(error?.data?.message || "Login failed");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-7rem] h-64 w-64 rounded-full bg-cyan-400/16 blur-3xl sm:h-72 sm:w-72" />
        <div className="absolute right-[-8rem] top-[8%] h-64 w-64 rounded-full bg-indigo-500/18 blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute bottom-[-9rem] left-[12%] h-60 w-60 rounded-full bg-emerald-400/12 blur-3xl sm:left-[22%] sm:h-72 sm:w-72" />
      </div>

      <div className="relative mx-auto grid min-h-screen w-full max-w-[1380px] items-center gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[0.95fr_0.85fr] lg:px-8 lg:py-0">
        <div className="order-1 lg:order-1">
          <div className="mx-auto max-w-xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-3.5 py-2 text-xs text-slate-200 backdrop-blur sm:px-4 sm:text-sm">
              <Bike size={18} className="text-cyan-300" />
              Classy Shop delivery workspace
            </div>

            <h1 className="mt-4 max-w-2xl text-[2rem] font-black leading-[1.08] text-white sm:mt-5 sm:text-[2.8rem] lg:text-[3.2rem]">
              Professional rider dashboard for faster deliveries.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">
              Assigned orders, address details aur delivery actions ek clean
              workspace me. Focused UI, less noise, faster handling.
            </p>

            <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
              {featureCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-[1.35rem] border border-white/10 bg-white/6 p-4 backdrop-blur sm:rounded-[1.5rem]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/80 text-cyan-300">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-slate-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="order-2 flex items-center justify-center lg:order-2">
          <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.92))] shadow-[0_24px_64px_rgba(2,6,23,0.52)] backdrop-blur sm:rounded-[2rem]">
            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-[1rem] bg-gradient-to-br from-cyan-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-900/30 sm:h-14 sm:w-14 sm:rounded-[1.25rem]">
                  <Bike size={22} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
                    Classy Shop
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">
                    Delivery Login
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Delivery partner account se sign in karo aur assigned orders ko
                directly handle karo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-7 sm:py-6">
              <label className="block">
                <span className="mb-2.5 block text-sm font-medium text-slate-300">
                  Email
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3.5 transition focus-within:border-cyan-300/40 focus-within:bg-white/9 sm:rounded-2xl">
                  <Mail size={18} className="text-cyan-300" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="delivery@classyshop.site"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2.5 block text-sm font-medium text-slate-300">
                  Password
                </span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3.5 transition focus-within:border-cyan-300/40 focus-within:bg-white/9 sm:rounded-2xl">
                  <LockKeyhole size={18} className="text-cyan-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 transition hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl"
              >
                {isLoading ? <AuthButtonLoader /> : "Login to dashboard"}
              </button>

              <div className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs leading-5 text-slate-400 sm:rounded-2xl">
                Vendor dashboard se banaya gaya delivery partner email/password hi
                yahan kaam karega.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
