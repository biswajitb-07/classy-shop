import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPerson } from "react-icons/io5";
import { GoMail } from "react-icons/go";
import { MdLockOutline } from "react-icons/md";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-hot-toast";

import {
  useRegisterUserMutation,
  useLoginUserMutation,
} from "../../../features/api/authApi";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader";

const Login = () => {
  const [state, setState] = useState("Login");
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const [signupInput, setSignupInput] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loginInput, setLoginInput] = useState({
    email: "",
    password: "",
  });

  const [registerUser, { isLoading: registerIsLoading }] =
    useRegisterUserMutation();
  const [loginUser, { isLoading: loginIsLoading }] = useLoginUserMutation();

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupInput((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setRememberMe(checked);
    } else {
      setLoginInput((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail) {
      setLoginInput((prev) => ({ ...prev, email: savedEmail }));
    }
    if (savedPassword) {
      setLoginInput((prev) => ({ ...prev, password: savedPassword }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      if (state === "Sign Up") {
        const registerResponse = await registerUser(signupInput).unwrap();
        toast.success(registerResponse.message || "Signup successful");
        setState("Login");
      } else {
        const loginResponse = await loginUser(loginInput).unwrap();
        toast.success(loginResponse.message || "Login successful");
        navigate("/");

        if (rememberMe) {
          localStorage.setItem("rememberedEmail", loginInput.email);
          localStorage.setItem("rememberedPassword", loginInput.password);
        } else {
          localStorage.removeItem("rememberedEmail");
          localStorage.removeItem("rememberedPassword");
        }
      }
    } catch (error) {
      console.error(error);
      if (error?.data?.errors) {
        setErrors(error.data.errors);
      } else {
        const errorMessage =
          error?.data?.message || "Something went wrong, please try again.";
        toast.error(errorMessage);
      }
    }
  };

  const handleGoogle = () => {
    setGoogleLoading(true);
    window.location.href = `${
      import.meta.env.VITE_API_URL
    }/api/v1/user/auth/google`;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-red-600 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row">
        {/* Left Side - Image */}
        <div className="lg:w-1/2 relative hidden lg:block">
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
          <img
            src="./login/login.jpg"
            alt="Login visual"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 left-10 right-10 z-20 text-white">
            <h2 className="text-4xl font-bold mb-3">
              {state === "Sign Up" ? "Join Our Community" : "Welcome Back"}
            </h2>
            <p className="text-lg opacity-90">
              {state === "Sign Up"
                ? "Start your journey with us today"
                : "We're so excited to see you again!"}
            </p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img
                src="./logo.jpg"
                alt="Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {state === "Sign Up" ? "Create Account" : "Sign In"}
            </h1>
            <p className="text-gray-500">
              {state === "Sign Up"
                ? "Fill in your details to get started"
                : "Enter your credentials to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            {state === "Sign Up" && (
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 bottom-5 flex items-center pl-3 pointer-events-none text-pink-600 group-focus-within:text-pink-700">
                  <IoPerson className="text-lg" />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  required
                  value={signupInput.name}
                  onChange={handleSignupChange}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  } focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-200`}
                />
                <div className="min-h-[20px]">
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>
              </div>
            )}
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 bottom-5 flex items-center pl-3 pointer-events-none text-pink-600 group-focus-within:text-pink-700">
                <GoMail className="text-lg" />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                required
                value={
                  state === "Sign Up" ? signupInput.email : loginInput.email
                }
                onChange={
                  state === "Sign Up" ? handleSignupChange : handleLoginChange
                }
                className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-200`}
              />
              <div className="min-h-[20px]">
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>
            </div>
            <div className="group relative">
              <div className="absolute inset-y-0 left-0 bottom-5 flex items-center pl-3 pointer-events-none text-pink-600 group-focus-within:text-pink-700">
                <MdLockOutline className="text-lg" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                required
                value={
                  state === "Sign Up"
                    ? signupInput.password
                    : loginInput.password
                }
                onChange={
                  state === "Sign Up" ? handleSignupChange : handleLoginChange
                }
                className={`w-full pl-10 pr-10 py-3 rounded-lg border ${
                  errors.password ? "border-red-500" : "border-gray-300"
                } focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all duration-200`}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 bottom-4 flex items-center pr-3 text-gray-500 hover:text-pink-600 cursor-pointer"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
              <div className="min-h-[20px]">
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>
            </div>
            {state === "Login" && (
              <div className="flex justify-between items-center pb-3">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    onChange={handleLoginChange}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                    checked={rememberMe}
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/reset-password")}
                  className="text-sm text-pink-500 hover:text-pink-600 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button
              type="submit"
              disabled={registerIsLoading || loginIsLoading}
              className={`w-full py-3 px-4 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer ${
                registerIsLoading || loginIsLoading
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {registerIsLoading || loginIsLoading ? (
                <AuthButtonLoader />
              ) : (
                state
              )}
            </button>
          </form>

          <div className="mt-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <div className="mt-3 gap-3">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-pink-700 hover:bg-gray-200 cursor-pointer"
              >
                {googleLoading ? (
                  <AuthButtonLoader />
                ) : (
                  <>
                    <img
                      src="./login/google.webp"
                      alt="Google logo"
                      className="w-5 h-5 mr-2"
                    />
                    Continue with Google
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            {state === "Sign Up" ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setState("Login")}
                  className="font-medium text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setState("Sign Up")}
                  className="font-medium text-pink-500 hover:text-pink-600 hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
