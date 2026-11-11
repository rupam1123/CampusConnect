import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Mail,
  Lock,
  ArrowRight,
  User,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

import { API_BASE } from "../lib/api";

function Login() {
  const navigate = useNavigate();

  // Form State
  const [role, setRole] = useState("Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Basic Form Validation (No strength checks for Login)
  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({});

    // Run validation before API call
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "Invalid credentials. Please try again.");
      }

      setToast({
        type: "success",
        message: "Login successful! Redirecting...",
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

setTimeout(() => {
  // Redirection based on Role
  if (data.user.role === "Professor") {
    navigate("/courses"); // Or "/manage-courses" if that's your pref
  } else {
    navigate("/courses"); // Redirect Students to their course viewer
  }
}, 1500);
    } catch (err) {
      setToast({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans relative overflow-hidden">
      {/* --- TOAST NOTIFICATION UI --- */}
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

      {/* Left Hero Section (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-600 blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] rounded-full bg-blue-600 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-start p-16 w-full h-full">
          {/* Desktop Logo */}
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
              Empowering the <span className="text-indigo-400">academic</span>{" "}
              community.
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              Join thousands of students and professors collaborating on
              cutting-edge projects, discussing coursework, and shaping the
              future of education.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Mobile/Tablet Logo (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <GraduationCap size={28} strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-black text-slate-900 tracking-tight">
              Campus<span className="text-indigo-600">Connect</span>
            </span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              Please enter your details to sign in.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="bg-slate-200/50 p-1 rounded-xl flex">
            <button
              type="button"
              onClick={() => setRole("Student")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${role === "Student" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <User size={18} /> Student
            </button>
            <button
              type="button"
              onClick={() => setRole("Professor")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${role === "Professor" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <BookOpen size={18} /> Professor
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
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

            {/* Password Field with Monkey Toggle */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to="/forgot"
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative group">
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
                  className={`w-full pl-11 pr-12 py-3.5 bg-white border-2 rounded-xl outline-none transition-all font-medium text-slate-700 ${errors.password ? "border-red-500 focus:ring-1 ring-red-100" : "border-slate-200 focus:border-indigo-500"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl hover:scale-110 transition-transform focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🐵" : "🙈"}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"} text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group mt-2`}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && (
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 font-medium">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-indigo-600 font-bold hover:underline"
            >
              Sign up
            </Link>
          </p>
          <p className="text-center">
            <Link
              to="/admin-login"
              className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Admin login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
