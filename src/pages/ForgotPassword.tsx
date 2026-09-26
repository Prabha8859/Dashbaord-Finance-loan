import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { requestPasswordResetOtp, resetPasswordWithOtp } from "../api/auth";
import { getApiErrorMessage } from "../utils/apiError";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const RESEND_COOLDOWN_SECONDS = 60;

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: "Email is required" });
      return;
    }
    setErrors({});

    setIsSubmitting(true);
    try {
      await requestPasswordResetOtp(trimmed);
      setStep("reset");
      startCooldown();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Unable to send OTP. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setFormError("");
    setIsSubmitting(true);
    try {
      await requestPasswordResetOtp(email.trim());
      startCooldown();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Unable to resend OTP. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateResetForm = () => {
    const next: Record<string, string> = {};
    if (!otp.trim()) next.otp = "OTP is required";
    else if (!/^\d{6}$/.test(otp.trim())) next.otp = "Enter the 6-digit OTP";

    if (!newPassword) next.newPassword = "New password is required";
    else if (!PASSWORD_REGEX.test(newPassword))
      next.newPassword = "At least 8 characters, with a letter and a number";

    if (!confirmPassword) next.confirmPassword = "Confirm your new password";
    else if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!validateResetForm()) return;

    setIsSubmitting(true);
    try {
      await resetPasswordWithOtp({ email: email.trim(), otp: otp.trim(), newPassword });
      setStep("done");
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Unable to reset password. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #eaf5f8 0%, #eefaf5 100%)" }}
    >
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md overflow-hidden">
        <div style={{ height: "4px", background: "linear-gradient(90deg, #066a9c, #26ae90, #f2f231)" }} />
        <div className="p-8">
          {step === "done" ? (
            <div className="text-center py-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
              >
                <CheckCircle2 className="text-white" size={24} />
              </div>
              <h1 className="text-lg font-semibold text-slate-800 mb-1">Password reset</h1>
              <p className="text-sm text-slate-500 mb-6">
                Your password has been changed successfully. You can now sign in with your new
                password.
              </p>
              <button
                onClick={() => navigate("/login", { replace: true })}
                className="w-full text-white text-sm font-medium py-2.5 rounded-md transition hover:brightness-110"
                style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 mb-4 transition"
              >
                <ArrowLeft size={13} />
                Back to Sign In
              </Link>

              <h1 className="text-xl font-semibold mb-1" style={{ color: "rgb(0, 102, 153)" }}>
                Forgot Password
              </h1>
              <p className="text-sm text-slate-500 mb-6">
                {step === "email"
                  ? "Enter your admin email and we'll send you a one-time code."
                  : `Enter the 6-digit code sent to ${email} and choose a new password.`}
              </p>

              {step === "email" ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                      autoFocus
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@indexiafinance.com"
                      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                        errors.email ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full text-white text-sm font-medium py-2.5 rounded-md transition disabled:opacity-60 hover:brightness-110"
                    style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
                  >
                    {isSubmitting ? "Sending..." : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      OTP Code
                    </label>
                    <input
                      autoFocus
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className={`w-full rounded-md border px-3 py-2 text-sm tracking-[0.3em] font-semibold text-center focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                        errors.otp ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    {errors.otp && <p className="text-xs text-red-600 mt-1">{errors.otp}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                        errors.newPassword ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    {errors.newPassword ? (
                      <p className="text-xs text-red-600 mt-1">{errors.newPassword}</p>
                    ) : (
                      <p className="text-xs text-slate-400 mt-1">
                        At least 8 characters, with a letter and a number.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(0,102,153,0.4)] ${
                        errors.confirmPassword ? "border-red-400" : "border-slate-300"
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {formError && <p className="text-sm text-red-600">{formError}</p>}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full text-white text-sm font-medium py-2.5 rounded-md transition disabled:opacity-60 hover:brightness-110"
                    style={{ background: "linear-gradient(135deg, rgb(6, 106, 156), rgb(38, 174, 144))" }}
                  >
                    {isSubmitting ? "Resetting..." : "Reset Password"}
                  </button>

                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || isSubmitting}
                    className="w-full text-xs font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 transition py-1"
                  >
                    {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
