import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useSendResetOtpMutation,
  useResetPasswordMutation,
} from "../../../features/api/authApi";
import { GoMail } from "react-icons/go";
import { MdLockOutline } from "react-icons/md";
import AuthButtonLoader from "../../../components/Loader/AuthButtonLoader";

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
      await sendResetOtp({ email }).unwrap();
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
    <div className="min-h-screen bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {step === 1 ? "Forgot Password" : "Reset Password"}
        </h2>

        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                <GoMail />
              </div>
              <input
                type="email"
                placeholder="Enter your registered email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className={`w-full py-3 rounded-lg font-semibold transition cursor-pointer
                ${
                  sending
                    ? "bg-amber-300 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
            >
              {sending ? <AuthButtonLoader /> : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="text"
              placeholder="6-digit OTP"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
            />

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                <MdLockOutline />
              </div>
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={resetting}
              className={`w-full py-3 rounded-lg font-semibold transition cursor-pointer
                ${
                  resetting
                    ? "bg-amber-300 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-600 text-white"
                }`}
            >
              {resetting ? <AuthButtonLoader /> : "Reset Password"}
            </button>
          </form>
        )}

        <button
          onClick={() => navigate("/login")}
          className="mt-4 text-sm text-amber-600 hover:underline w-full text-center cursor-pointer"
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
