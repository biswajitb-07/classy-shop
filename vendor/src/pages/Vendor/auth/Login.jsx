import { useLayoutEffect, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GoMail } from "react-icons/go";
import { MdLockOutline } from "react-icons/md";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-hot-toast";

import { useLoginUserMutation } from "../../../features/api/authApi";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loginInput, setLoginInput] = useState({
    email: "",
    password: "",
  });

  const [loginUser, { isLoading }] = useLoginUserMutation();

  useLayoutEffect(() => {
    document.documentElement.classList.add("auth-light-page");
    const previousTheme = document.documentElement.dataset.theme;
    const previousColorScheme = document.documentElement.style.colorScheme;
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";

    return () => {
      document.documentElement.classList.remove("auth-light-page");
      if (previousTheme) {
        document.documentElement.dataset.theme = previousTheme;
      } else {
        delete document.documentElement.dataset.theme;
      }
      document.documentElement.style.colorScheme = previousColorScheme;
    };
  }, []);

  useEffect(() => {

    const params = new URLSearchParams(location.search);
    if (params.get("blocked") === "1" || params.get("google") === "blocked") {
      toast.error(
        params.get("message") ||
          "Your account has been blocked plz contact customer care"
      );
    }

    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail) {
      setLoginInput((prev) => ({ ...prev, email: savedEmail }));
    }
    if (savedPassword) {
      setLoginInput((prev) => ({ ...prev, password: savedPassword }));
      setRememberMe(true);
    }
  }, [location.search]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setRememberMe(checked);
    } else {
      setLoginInput((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(loginInput).unwrap();
      toast.success(res.message || "Login successful");

      /* remember-me logic */
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", loginInput.email);
        localStorage.setItem("rememberedPassword", loginInput.password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(err?.data?.message || "Login failed");
    }
  };

  const togglePasswordVisibility = () => setShowPassword((p) => !p);
  const authInputStyle = {
    backgroundColor: "#ffffff",
    color: "#000000",
    WebkitTextFillColor: "#000000",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
        {/* --- Left Image --- */}
        <div className="lg:w-1/2 relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10" />
          <img
            src="./login/login.jpg"
            alt="Login visual"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
            <h2 className="text-4xl font-bold mb-3">Welcome Back</h2>
            <p className="text-lg opacity-90">
              We're so excited to see you again!
            </p>
          </div>
        </div>

        {/* --- Right Form --- */}
        <div className="auth-light-surface lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center text-slate-900">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="/logo-light.png"
                alt="Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-[#1f2937] mb-2">Sign In</h1>
            <p className="text-[#6b7280]">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Keep auth inputs on a white surface even when the vendor app runs in dark mode. */}
            {/* Email */}
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-amber-600 group-focus-within:text-amber-700">
                <GoMail className="text-lg" />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={loginInput.email}
                onChange={handleChange}
                style={authInputStyle}
                className="auth-light-input appearance-none w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-black placeholder:text-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200"
              />
            </div>

            {/* Password */}
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-amber-600 group-focus-within:text-amber-700">
                <MdLockOutline className="text-lg" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                value={loginInput.password}
                onChange={handleChange}
                style={authInputStyle}
                className="auth-light-input appearance-none w-full pl-10 pr-10 py-3 rounded-lg border border-gray-300 bg-white text-black placeholder:text-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all duration-200"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-amber-600 cursor-pointer"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            {/* Remember me / Forgot password */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-[#374151]"
                >
                  Remember me
                </label>
              </div>
              <button
                type="button"
                onClick={() => navigate("/reset-password")}
                className="text-sm text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                isLoading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? <AuthButtonLoader /> : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
