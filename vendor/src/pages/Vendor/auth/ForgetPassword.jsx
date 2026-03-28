import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  useSendResetOtpMutation,
  useResetPasswordMutation,
} from "../../../features/api/authApi";
import { GoMail } from "react-icons/go";
import { MdLockOutline } from "react-icons/md";
import AuthButtonLoader from "../../../component/Loader/AuthButtonLoader";

const ForgetPassword = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 flex justify-center">
            <img
              src="/logo-light.png"
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 1 ? "Forgot Password" : "Reset Password"}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {step === 1
              ? "Enter your vendor email to receive a verification OTP."
              : "Use the OTP from your email and set a new password."}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <div
            className={`h-2 w-20 rounded-full ${
              step >= 1 ? "bg-amber-500" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-2 w-20 rounded-full ${
              step >= 2 ? "bg-amber-500" : "bg-slate-200"
            }`}
          />
        </div>

        <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-[0.16em] text-amber-600">
          {step === 1 ? "Step 1: Verify Email" : "Step 2: Set New Password"}
        </h3>

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

      </div>
    </div>
  );
};

export default ForgetPassword;
