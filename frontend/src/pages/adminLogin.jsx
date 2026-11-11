// frontend/src/pages/adminLogin.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Loader2, AlertCircle, ArrowLeft } from "lucide-react";

import { API_BASE } from "../lib/api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok)
        throw new Error(data.error || data.msg || "Unauthorized access");

      localStorage.setItem("adminToken", data.token);
      navigate("/admin-dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6 text-slate-900 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-red-100 text-red-600 rounded-full mb-4">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-extrabold">Admin Access</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Authorized personnel only
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl mb-6">
            <AlertCircle size={18} className="shrink-0" /> <p>{error}</p>
          </div>
        )}

        <form onSubmit={login} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Master Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="space-y-4 pt-2">
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                "Authenticate"
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft size={16} /> Back to User Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
