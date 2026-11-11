import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  User,
  BookOpen,
  UserCircle,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

import { API_BASE, allowedEmail } from "../lib/api";

function Signup() {
  const navigate = useNavigate();

  // Multi-step & Role State
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("Student");

  // Form State
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);

  // Auto-hide toast after 5 seconds
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

  // Clear errors when changing steps or roles
  useEffect(() => {
    setErrors({});
  }, [step, role]);

  // Password strength
  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
    return score;
  };
  const strengthScore = calculateStrength(password);

  // STEP 1: Send OTP
  const handleSendOTP = async (e) => {
    e?.preventDefault();
    const newErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email format";
    } else if (!allowedEmail(email)) {
      newErrors.email = "Use your Gmail address (existing IITK accounts are supported)";
    }

    if (Object.keys(newErrors).length > 0) {
      return setErrors(newErrors);
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Failed to send OTP");

      setToast({ type: "success", message: "OTP sent to your email!" });
      setResendTimer(30); // Start the 30-second countdown
      setTimeout(() => setStep(2), 1000);
    } catch (err) {
      setToast({ type: "error", message: err.message || "Error sending OTP" });
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle OTP Input & Verify
  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    // Take only the last character in case they type fast
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    if (errors.otp) setErrors({ ...errors, otp: null });

    // Auto-focus next input
    if (value !== "" && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      otpRefs.current[index - 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6).split("");
    if (pastedData.some(isNaN)) return; // Don't paste if contains letters

    const newOtp = [...otp];
    pastedData.forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    // Focus last filled input
    const focusIndex = Math.min(pastedData.length, 5);
    if (otpRefs.current[focusIndex]) otpRefs.current[focusIndex].focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      return setErrors({ otp: "Please enter the complete 6-digit OTP." });
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Invalid OTP");

      setToast({ type: "success", message: "Email verified successfully!" });
      setStep(3);
    } catch (err) {
      setErrors({ otp: err.message || "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: Final Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (role === "Student" && !username.trim()) {
      newErrors.username = "Username is required";
    }
    if (role === "Professor" && !name.trim()) {
      newErrors.name = "Full name is required";
    }
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (strengthScore < 2) {
      newErrors.password = "Password is too weak. Add uppercase/numbers.";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      return setErrors(newErrors);
    }

    const otpString = otp.join("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: role === "Professor" ? name.trim() : undefined,
          username: role === "Student" ? username.trim() : undefined,
          email: email.trim(),
          password,
          otp: otpString,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || "Signup failed");

      setToast({ type: "success", message: "Account created! Redirecting..." });
      // Reset form fields
      setPassword("");
      setConfirmPassword("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setToast({
        type: "error",
        message: err.message || "Error during signup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans relative overflow-hidden">
      {/* TOAST NOTIFICATION UI */}
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

      {/* LEFT - Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-16 w-full h-full">
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
              Start your <span className="text-indigo-400">academic</span>{" "}
              journey.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              Create your free account today. Join thousands of students and
              professors collaborating on cutting-edge projects and shaping the
              future of education.
            </p>
          </div>

          <div className="flex items-center gap-4 mt-auto pt-10">
          

          </div>
        </div>
      </div>

      {/* RIGHT - Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative overflow-y-auto">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 my-auto">
          {/* Mobile/Tablet Logo */}
          <div className="flex lg:hidden items-center justify-start gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={28} strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              Campus<span className="text-indigo-600">Connect</span>
            </span>
          </div>

          {/* Header & Role Selection (Only Step 1) */}
          {step === 1 && (
            <>
              <div className="text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Create an account
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Verify your identity to get started.
                </p>
              </div>

              <div className="bg-slate-200/50 p-1 rounded-xl flex">
                <button
                  type="button"
                  onClick={() => setRole("Student")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                    role === "Student"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <User size={18} /> Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole("Professor")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
                    role === "Professor"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <BookOpen size={18} /> Professor
                </button>
              </div>
            </>
          )}

          {/* ================= STEP 1: EMAIL ================= */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Institutional Email
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
                    placeholder="name@gmail.com"
                    className={`w-full pl-11 pr-4 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 ${
                      errors.email
                        ? "border-red-500 focus:ring-1 ring-red-100"
                        : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                </div>
                {errors.email ? (
                  <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">
                    We will send a verification code to this address.
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group`}
                >
                  {loading ? "Sending Code..." : "Continue"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: OTP ================= */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-center lg:text-left mb-6">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Verify Email
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Enter the 6-digit code sent to <br />
                  <span className="text-indigo-600 font-bold">{email}</span>
                </p>
              </div>

              <div>
                <div className="flex justify-between gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      maxLength={1}
                      value={digit}
                      ref={(el) => (otpRefs.current[index] = el)}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-white border-2 rounded-xl outline-none transition-all text-slate-800 ${
                        errors.otp
                          ? "border-red-500 focus:bg-red-50 focus:border-red-500"
                          : "border-slate-200 focus:border-indigo-500 focus:bg-indigo-50"
                      }`}
                    />
                  ))}
                </div>
                {errors.otp && (
                  <p className="text-red-500 text-xs mt-3 font-bold flex items-center justify-center gap-1">
                    <AlertCircle size={12} /> {errors.otp}
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group`}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
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
                        onClick={handleSendOTP}
                        disabled={loading}
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

          {/* ================= STEP 3: FINAL DETAILS ================= */}
          {step === 3 && (
            <form
              onSubmit={handleSignup}
              className="space-y-5 animate-in fade-in zoom-in-95 duration-300"
            >
              <div className="text-center lg:text-left mb-6">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  Secure your account
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Set up your profile credentials.
                </p>
              </div>

              {/* Student specific field */}
              {role === "Student" && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Anonymous Name
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.username ? "text-red-400" : "text-slate-400"}`}
                    >
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (errors.username)
                          setErrors({ ...errors, username: null });
                      }}
                      placeholder="e.g. arjun_22"
                      className={`w-full pl-11 pr-4 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 ${
                        errors.username
                          ? "border-red-500 focus:ring-1 ring-red-100"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                    />
                  </div>
                  {errors.username ? (
                    <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.username}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      Must be unique.
                    </p>
                  )}
                </div>
              )}

              {/* Professor specific field */}
              {role === "Professor" && (
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.name ? "text-red-400" : "text-slate-400"}`}
                    >
                      <UserCircle size={18} />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors({ ...errors, name: null });
                      }}
                      placeholder="e.g. Dr. Arjun Mehta"
                      className={`w-full pl-11 pr-4 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 ${
                        errors.name
                          ? "border-red-500 focus:ring-1 ring-red-100"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>
              )}

              {/* Shared Password Field */}
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative group overflow-hidden rounded-xl">
                  <div
                    className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none ${errors.password ? "text-red-400" : "text-slate-400"}`}
                  >
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors({ ...errors, password: null });
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-11 pr-12 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 pb-4 ${
                      errors.password
                        ? "border-red-500 focus:ring-1 ring-red-100"
                        : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl hover:scale-110 transition-transform focus:outline-none pb-1"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🐵" : "🙈"}
                  </button>

                  {password.length > 0 && (
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

                {errors.password ? (
                  <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.password}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-2 font-medium">
                    Must be at least 8 characters with 1 uppercase letter and 1
                    number.
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
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
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

                  {confirmPassword.length > 0 && (
                    <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full rounded-b-xl flex">
                      <div
                        className={`h-full transition-all duration-300 ${
                          calculateStrength(confirmPassword) === 0
                            ? "w-1/3 bg-red-500"
                            : calculateStrength(confirmPassword) === 1
                              ? "w-1/3 bg-red-500"
                              : calculateStrength(confirmPassword) === 2
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
                ) : confirmPassword.length > 0 ? (
                  <p className={`text-xs mt-1.5 font-bold flex items-center gap-1 ${
                    confirmPassword === password ? "text-green-500" : "text-red-500"
                  }`}>
                    {confirmPassword === password ? "✓ Passwords match" : "⚠ Passwords do not match"}
                  </p>
                ) : null}
              </div>

              <div className="space-y-4 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group mt-6`}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                  {!loading && (
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  )}
                </button>

                {/* Back Button for Final Step */}
                <div className="flex items-center justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer Link (Only Step 1) */}
          {step === 1 && (
            <p className="text-center text-slate-500 font-medium pb-8 lg:pb-0">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-indigo-600 font-bold hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Signup;
