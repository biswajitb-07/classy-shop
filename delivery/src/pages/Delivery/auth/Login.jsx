import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Bike, LockKeyhole, Mail } from "lucide-react";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";
import { useLoginUserMutation } from "../../../features/api/authApi";

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
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
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src="/login/login.jpg"
            alt="Delivery login"
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/60 to-indigo-900/70" />
          <div className="absolute inset-0 p-12">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-slate-200 backdrop-blur">
                <Bike size={18} className="text-indigo-300" />
                Delivery partners workspace
              </div>
              <h1 className="mt-8 text-5xl font-black leading-tight">
                Assigned orders ko ek hi jagah se handle karo.
              </h1>
              <p className="mt-6 max-w-lg text-base text-slate-300">
                Pickup, out for delivery, delivered updates aur rider profile sab
                is alag dashboard se manage hoga.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/60 backdrop-blur">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.35em] text-slate-500">
                Classy Shop
              </p>
              <h2 className="mt-3 text-3xl font-bold">Delivery Login</h2>
              <p className="mt-2 text-sm text-slate-400">
                Apne assigned orders dekhne ke liye sign in karo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <Mail size={18} className="text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="delivery@classyshop.site"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Password
                </span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                  <LockKeyhole size={18} className="text-slate-500" />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? <AuthButtonLoader /> : "Login to dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
