// frontend/src/pages/adminDashboard.jsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Plus, CheckCircle2, AlertCircle,
  Loader2, LogOut, Trash2, UserCheck, UserX, RefreshCw,
} from "lucide-react";

import { API_BASE, allowedEmail } from "../lib/api";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [deleteTarget, setDeleteTarget] = useState(null); // { _id, email, hasAccount }
  const [deleting, setDeleting] = useState(false);

  const token = localStorage.getItem("adminToken");

  const showStatus = useCallback((type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: "", message: "" }), 5000);
  }, []);

  const fetchProfessors = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/professors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to load professor list');
      setProfessors(Array.isArray(data) ? data : []);
    } catch {
      showStatus("error", "Failed to load professor list.");
    } finally {
      setListLoading(false);
    }
  }, [token, showStatus]);

  useEffect(() => {
    if (!token) navigate('/admin-login');
    else fetchProfessors();
  }, [token, navigate, fetchProfessors]);

  const addProf = async (e) => {
    e.preventDefault();
    if (!email || !allowedEmail(email)) {
      return showStatus("error", "Use a Gmail address or existing IITK address");
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/add-professor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.msg || "Failed to add professor.");
      showStatus("success", `${email} has been authorized.`);
      setEmail("");
      setName("");
      fetchProfessors();
    } catch (err) {
      showStatus("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (prof) => {
    setDeleteTarget(prof);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/professors/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        // 409 = account exists
        showStatus("error", data.msg);
        setDeleteTarget(null);
        return;
      }
      showStatus("success", data.msg);
      setDeleteTarget(null);
      fetchProfessors();
    } catch {
      showStatus("error", "Server error while removing.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* Top Nav */}
      <div className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center px-8">
        <div className="flex items-center gap-2 font-black text-xl">
          <ShieldCheck className="text-indigo-400" /> Admin Console
        </div>
        <button
          onClick={() => { localStorage.removeItem("adminToken"); navigate("/admin-login"); }}
          className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="p-4 sm:p-8 max-w-4xl mx-auto mt-6 space-y-6">

        {/* Status Banner */}
        {status.message && (
          <div className={`flex items-center gap-2 p-4 rounded-xl font-bold text-sm animate-in fade-in slide-in-from-top-2 border ${status.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {status.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {status.message}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 text-center mb-2">Remove from Whitelist?</h3>
              {deleteTarget.hasAccount ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800 font-medium text-center">
                    <strong className="block mb-1">⚠️ Account Exists</strong>
                    An active professor account already exists for <strong>{deleteTarget.email}</strong>.
                    Please ask the professor to delete their own account first before removing them from the whitelist.
                  </div>
                  <button onClick={() => setDeleteTarget(null)} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                    Close
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-500 text-center mb-6">
                    Removing <strong className="text-slate-800">{deleteTarget.email}</strong> from the whitelist will prevent this email from registering or logging in as a Professor.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm transition-colors">Cancel</button>
                    <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      {deleting ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add Professor Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="mb-6 border-b border-slate-100 pb-5">
            <h2 className="text-2xl font-extrabold">Professor Directory Control</h2>
            <p className="text-slate-500 font-medium mt-1 text-sm">
              Authorize faculty emails. Only emails added here can register as a Professor.
            </p>
          </div>

          <form onSubmit={addProf} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email" required
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                placeholder="faculty@gmail.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Full Name (Optional)</label>
              <input
                type="text"
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                placeholder="Dr. Example"
                value={name} onChange={e => setName(e.target.value)}
              />
            </div>
            <div className="sm:w-32 flex items-end">
              <button disabled={loading} className="w-full h-[52px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Add</>}
              </button>
            </div>
          </form>
        </div>

        {/* Professor List Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Authorized Professors</h3>
              <p className="text-slate-400 text-xs font-medium mt-0.5">{professors.length} email{professors.length !== 1 ? "s" : ""} in whitelist</p>
            </div>
            <button onClick={fetchProfessors} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          {listLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2" /> Loading…
            </div>
          ) : professors.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium">No professors authorized yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {professors.map(prof => (
                <li key={prof._id} className="flex items-center justify-between px-6 sm:px-8 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${prof.hasAccount ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                      {prof.hasAccount ? <UserCheck size={16} /> : <UserX size={16} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{prof.email}</p>
                      <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        {prof.name && <span className="text-slate-500">{prof.name} ·</span>}
                        <span className={prof.hasAccount ? "text-emerald-600 font-bold" : "text-slate-400"}>
                          {prof.hasAccount ? "Account active" : "No account yet"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteClick(prof)}
                    title="Remove from whitelist"
                    className="ml-4 p-2 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
