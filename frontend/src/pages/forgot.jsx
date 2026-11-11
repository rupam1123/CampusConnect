import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowLeft,
} from "lucide-react";

import { API_BASE } from "../lib/api";

export default function Forgot() {
  const navigate = useNavigate();

  // Navigation & Step State
  const [step, setStep] = useState(1); // 1: request OTP, 2: reset

  // Form State
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState(Array(6).fill(""));
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Refs for OTP boxes
  const otpRefs = useRef([]);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Resend Timer countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // --- Password Strength & Validation ---
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(newPass);

  const validateStep1 = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = "Email is required";
    else if (!emailRegex.test(email)) newErrors.email = "Enter a valid email";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    const fullOtp = otpValues.join("");

    if (fullOtp.length < 6) newErrors.otp = "Please enter the full 6-digit OTP";

    if (!newPass) newErrors.password = "New password is required";
    else if (newPass.length < 8)
      newErrors.password = "Must be at least 8 characters";
    else if (!/[A-Z]/.test(newPass))
      newErrors.password = "Must contain an uppercase letter";
    else if (!/[0-9]/.test(newPass))
      newErrors.password = "Must contain a number";

    if (!confirmPass) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPass !== confirmPass) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- OTP Input Handlers ---
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Only allow numbers

    const newOtp = [...otpValues];
    // Take only the last character in case they type fast
    newOtp[index] = value.substring(value.length - 1);
    setOtpValues(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
    if (errors.otp) setErrors({ ...errors, otp: null });
  };

  const handleOtpKeyDown = (index, e) => {
    // Auto-go back on backspace if current is empty
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.some(isNaN)) return; // Don't paste if contains letters

    const newOtp = [...otpValues];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtpValues(newOtp);
    // Focus last filled input
    const focusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[focusIndex].focus();
  };

  // --- API Handlers ---
  const requestOtp = async (e) => {
    e?.preventDefault();
    if (!validateStep1()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Error sending OTP");

      setToast({ type: "success", message: "OTP sent to your email!" });
      setStep(2);
      setResendTimer(30); // Start 30s countdown
    } catch (err) {
      setToast({ type: "error", message: err.message || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e?.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    const fullOtp = otpValues.join("");

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: fullOtp, newPassword: newPass }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Reset failed");

      setToast({
        type: "success",
        message: "Password reset successfully! Redirecting...",
      });
      // Reset form fields
      setNewPass("");
      setConfirmPass("");
      setOtpValues(Array(6).fill(""));
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Error resetting password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans relative overflow-hidden">
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <p className="text-sm font-bold">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- LEFT HERO SECTION (Desktop Only) --- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-start p-16 w-full h-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
              <GraduationCap size={32} strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-black text-white tracking-tight">
              Campus<span className="text-indigo-400">Connect</span>
            </span>
          </div>

          <div className="space-y-6 max-w-lg mt-20">
            <h1 className="text-5xl font-extrabold text-white leading-tight">
              Secure your <span className="text-indigo-400">academic</span>{" "}
              journey.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              Don't worry, it happens to the best of us. Reset your password
              securely and get back to collaborating.
            </p>
          </div>
        </div>
      </div>

      {/* --- RIGHT FORM SECTION --- */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center justify-start gap-3 mb-8">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={28} strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              Campus<span className="text-indigo-600">Connect</span>
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              {step === 1
                ? "Enter your email to receive a secure recovery code."
                : `We sent a 6-digit code to ${email}`}
            </p>
          </div>

          {/* === STEP 1: REQUEST OTP === */}
          {step === 1 && (
            <form onSubmit={requestOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.email ? "text-red-400" : "text-slate-400"}`}
                  >
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: null });
                    }}
                    placeholder="username@gmail.com"
                    className={`w-full pl-11 pr-4 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 ${errors.email ? "border-red-500 focus:ring-1 ring-red-100" : "border-slate-200 focus:border-indigo-500"}`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
              </div>

              {/* Step 1 Buttons */}
              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group`}
                >
                  {loading ? "Sending Code..." : "Send Recovery Code"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* === STEP 2: VERIFY OTP & NEW PASSWORD === */}
          {step === 2 && (
            <form onSubmit={resetPassword} className="space-y-6">
              {/* OTP Segmented Input */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  6-Digit OTP
                </label>
                <div className="flex justify-between gap-2">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className={`w-12 h-14 text-center text-xl font-extrabold bg-white border-2 rounded-xl outline-none transition-all text-slate-700 ${errors.otp ? "border-red-500" : "border-slate-200 focus:border-indigo-500"}`}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.otp}
                  </p>
                )}
              </div>

              {/* Strict Password Input */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  New Password
                </label>
                <div className="relative group overflow-hidden rounded-xl">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.password ? "text-red-400" : "text-slate-400"}`}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPass}
                    onChange={(e) => {
                      setNewPass(e.target.value);
                      if (errors.password)
                        setErrors({ ...errors, password: null });
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 pb-4 ${errors.password ? "border-red-500 focus:ring-1 ring-red-100" : "border-slate-200 focus:border-indigo-500"}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl hover:scale-110 transition-transform focus:outline-none pb-1"
                  >
                    {showPassword ? "🐵" : "🙈"}
                  </button>

                  {/* Red/Yellow/Green Strength Indicator */}
                  {newPass.length > 0 && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full rounded-b-xl flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strengthScore === 0
                            ? "w-1/3 bg-red-500"
                            : strengthScore === 1
                              ? "w-1/3 bg-red-500"
                              : strengthScore === 2
                                ? "w-2/3 bg-yellow-500"
                                : "w-full bg-green-500"
                        }`}
                      ></div>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 mt-2 font-medium">
                  Must be at least 8 characters with 1 uppercase letter and 1
                  number.
                </p>

                {errors.password && (
                  <p className="text-red-500 text-xs mt-1 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Confirm Password
                </label>
                <div className="relative group overflow-hidden rounded-xl">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.confirmPassword ? "text-red-400" : "text-slate-400"}`}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPass}
                    onChange={(e) => {
                      setConfirmPass(e.target.value);
                      if (errors.confirmPassword)
                        setErrors({ ...errors, confirmPassword: null });
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 pb-4 ${
                      errors.confirmPassword
                        ? "border-red-500 focus:ring-1 ring-red-100"
                        : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl hover:scale-110 transition-transform focus:outline-none pb-1"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? "🐵" : "🙈"}
                  </button>

                  {confirmPass.length > 0 && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full rounded-b-xl flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          getPasswordStrength(confirmPass) === 0
                            ? "w-1/3 bg-red-500"
                            : getPasswordStrength(confirmPass) === 1
                              ? "w-1/3 bg-red-500"
                              : getPasswordStrength(confirmPass) === 2
                                ? "w-2/3 bg-yellow-500"
                                : "w-full bg-green-500"
                        }`}
                      ></div>
                    </div>
                  )}
                </div>

                {errors.confirmPassword ? (
                  <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.confirmPassword}
                  </p>
                ) : confirmPass.length > 0 ? (
                  <p className={`text-xs mt-1.5 font-bold flex items-center gap-1 ${
                    confirmPass === newPass ? "text-green-500" : "text-red-500"
                  }`}>
                    {confirmPass === newPass ? "✓ Passwords match" : "⚠ Passwords do not match"}
                  </p>
                ) : null}
              </div>

              {/* Step 2 Buttons & Resend Controls */}
              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group`}
                >
                  {loading ? "Resetting..." : "Save New Password"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  )}
                </button>

                {/* Inline Back & Resend */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>

                  <p className="text-sm font-medium text-slate-500">
                    Didn't receive OTP?{" "}
                    {resendTimer > 0 ? (
                      <span className="text-slate-400">
                        Resend in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={requestOtp}
                        className="text-indigo-600 font-bold hover:underline"
                      >
                        Resend
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
