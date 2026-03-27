import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useSendResetOtpMutation,
  useResetPasswordMutation,
} from "../../../features/api/authApi.js";
import { GoMail } from "react-icons/go";
import { MdLockOutline } from "react-icons/md";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader.jsx";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [sendResetOtp, { isLoading: sending }] = useSendResetOtpMutation();
  const [resetPassword, { isLoading: resetting }] = useResetPasswordMutation();

  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await sendResetOtp(email).unwrap();
      toast.success("OTP sent to your email");
      setStep(2);
    } catch (err) {
      const msg =
        err?.data?.message ||
        (err?.status === "FETCH_ERROR"
          ? "Network error – check your internet / backend"
          : "Could not send OTP");
      toast.error(msg);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await resetPassword({ email, otp, newPassword }).unwrap();
      toast.success("Password reset successful! Login now.");
      navigate("/login");
    } catch (err) {
      const msg = err?.data?.message || "Reset failed";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-pink-500 to-red-600 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-32 sm:w-40 h-32 sm:h-40 bg-red-400/20 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 -right-10 w-48 sm:w-60 h-48 sm:h-60 bg-pink-400/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 sm:w-20 h-16 sm:h-20 bg-red-300/30 rounded-full blur-lg"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="backdrop-blur-lg bg-white/90 border border-white/20 rounded-3xl shadow-2xl p-6 sm:p-8 relative">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
              <MdLockOutline className="text-white w-6 sm:w-7 h-6 sm:h-7" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-gray-600 mt-2 text-sm">
              {step === 1
                ? "We'll send you a reset code"
                : "Enter the code and new password"}
            </p>
          </div>

          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4 sm:space-y-6">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 text-red-500 group-focus-within:text-red-600 transition-colors">
                  <GoMail size={18} sm:size={20} className="z-10" />
                </div>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl border-2 border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none transition-all duration-300 bg-white/70 backdrop-blur-sm placeholder-gray-500 text-sm sm:text-base"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-lg
                  ${
                    sending
                      ? "bg-gray-400 cursor-not-allowed scale-100"
                      : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-200 hover:shadow-xl"
                  }`}
              >
                {sending ? <AuthButtonLoader /> : "Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleReset} className="space-y-4 sm:space-y-6">
              <input
                type="text"
                placeholder="6-digit OTP"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 sm:py-4 rounded-xl border-2 border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none transition-all duration-300 bg-white/70 backdrop-blur-sm placeholder-gray-500 text-center text-base sm:text-lg font-mono tracking-widest"
              />

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4 text-red-500 group-focus-within:text-red-600 transition-colors">
                  <MdLockOutline size={18} sm:size={20} className="z-10" />
                </div>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 rounded-xl border-2 border-gray-200 focus:border-red-400 focus:ring-4 focus:ring-red-100 outline-none transition-all duration-300 bg-white/70 backdrop-blur-sm placeholder-gray-500 text-sm sm:text-base"
                />
              </div>

              <button
                type="submit"
                disabled={resetting}
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-[1.02] shadow-lg
                  ${
                    resetting
                      ? "bg-gray-400 cursor-not-allowed scale-100"
                      : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 shadow-red-200 hover:shadow-xl"
                  }`}
              >
                {resetting ? <AuthButtonLoader /> : "Reset Password"}
              </button>
            </form>
          )}

          {/* Step indicator */}
          <div className="flex justify-center mt-4 sm:mt-6 space-x-2">
            <div
              className={`w-6 sm:w-8 h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                step === 1
                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                  : "bg-gray-300"
              }`}
            ></div>
            <div
              className={`w-6 sm:w-8 h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                step === 2
                  ? "bg-gradient-to-r from-red-500 to-pink-500"
                  : "bg-gray-300"
              }`}
            ></div>
          </div>

          {/* Back to login button */}
          <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200/50">
            <button
              onClick={() => navigate("/login")}
              className="inline-flex items-center text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 transition-colors group"
            >
              <svg
                className="w-3 sm:w-4 h-3 sm:h-4 mr-1 transform group-hover:-translate-x-1 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
