import DashboardLayout from "../layouts/dashboard_layout.jsx";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check, X, Plus, Briefcase, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Filter, Clock, Code2,
  GitBranch, CalendarRange, Pencil, Trash2, ArrowUpDown,
} from "lucide-react";

import { API_BASE, readJson, getHeaders } from "../lib/api";

const BRANCHES = [
  "AE",
  "BSBE",
  "CHE",
  "CE",
  "CSE",
  "EE",
  "MSE",
  "ME",
  "DOMS",
  "SEE",
  "HSS",
  "CHM",
  "MTH",
  "PHY",
  "ES",
  "ECO",
  "CGS",
  "EEM",
  "PSE",
  "DES",
  "MS",
  "NET",
];

const BATCHES = ["Y25", "Y24", "Y23", "Y22"];

// ── Reusable multi-select dropdown ──────────────────────────────────────────
function MultiSelect({ options, selected, onChange, placeholder, disabled, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-slate-50 text-sm font-bold text-left transition-all
          ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-indigo-400"}
          ${error ? "border-red-400" : open ? "border-indigo-500 bg-white" : "border-slate-200"}`}
      >
        <span className={selected.length === 0 ? "text-slate-400 font-medium" : "text-slate-700"}>
          {selected.length === 0
            ? placeholder
            : selected.length <= 2
            ? selected.join(", ")
            : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700"
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                ${selected.includes(opt) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                {selected.includes(opt) && <Check size={11} className="text-white" strokeWidth={3} />}
              </span>
              <input type="checkbox" className="hidden" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
function ProfessorProject() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null); // null = create, obj = edit
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null); // project id to confirm

  const emptyForm = {
    title: "", description: "",
    branchesOpenToAll: false, branches: [],
    batchesOpenToAll: false, batches: [],
    cpi: "", skills: "", duration: "",
  };
  const [form, setForm] = useState(emptyForm);


  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProjects = useCallback(() => {
    fetch(`${API_BASE}/api/projects/managed`, { headers: getHeaders() })
      .then(readJson)
      .then((d) => setProjects(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const openCreate = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingProject(p);
    setForm({
      title: p.title,
      description: p.description,
      branchesOpenToAll: p.branches.includes("ALL"),
      branches: p.branches.includes("ALL") ? [] : p.branches,
      batchesOpenToAll: p.batches.includes("ALL"),
      batches: p.batches.includes("ALL") ? [] : p.batches,
      cpi: String(p.cpi),
      skills: p.skills || "",
      duration: p.duration || "",
    });
    setErrors({});
    setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.branchesOpenToAll && form.branches.length === 0) e.branches = "Select at least one branch or tick Open to All.";
    if (!form.batchesOpenToAll && form.batches.length === 0) e.batches = "Select at least one batch or tick Open to All.";
    if (form.cpi === "") e.cpi = "Min CPI is required.";
    else if (parseFloat(form.cpi) < 0 || parseFloat(form.cpi) > 10) e.cpi = "CPI must be 0–10.";
    return e;
  };

  const saveProject = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      branches: form.branchesOpenToAll ? ["ALL"] : form.branches,
      batches: form.batchesOpenToAll ? ["ALL"] : form.batches,
      cpi: parseFloat(form.cpi),
      skills: form.skills.trim(),
      duration: form.duration.trim(),
    };
    try {
      const url = editingProject
        ? `${API_BASE}/api/projects/${editingProject._id}`
        : `${API_BASE}/api/projects`;
      const method = editingProject ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      showToast(editingProject ? "Project updated!" : "Project launched!");
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE", headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      showToast("Project deleted.");
      setConfirmDelete(null);
      fetchProjects();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const updateAppStatus = async (appId, newStatus) => {
    try {
      await fetch(`${API_BASE}/api/projects/applications/${appId}`, {
        method: "PUT", headers: getHeaders(), body: JSON.stringify({ status: newStatus }),
      });
      fetchProjects();
    } catch (err) { console.error(err); }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-4 sm:p-6 font-sans">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm animate-in slide-in-from-top-4 fade-in
            ${toast.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
            {toast.type === "error" ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}
            <p className="font-bold">{toast.msg}</p>
          </div>
        )}

        {/* Delete Confirm */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95">
              <Trash2 size={32} className="text-red-500 mb-4"/>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2">Delete Project?</h3>
              <p className="text-sm text-slate-500 mb-6">This will permanently delete the project <strong>and all student applications</strong> associated with it. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(null)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm">Cancel</button>
                <button onClick={() => deleteProject(confirmDelete)} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm">Delete</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Project Applications</h2>
            <p className="text-slate-500 mt-1 text-sm">Review applications and manage your projects.</p>
          </div>
          <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg flex items-center gap-2 text-sm whitespace-nowrap transition-all active:scale-95">
            <Plus size={18} strokeWidth={3}/> Launch Project
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {projects.length === 0 && <p className="text-slate-500 py-12 text-center">No projects yet. Launch one!</p>}
          {projects.map((p) => (
            <ProjectCard
              key={p._id}
              project={p}
              updateAppStatus={updateAppStatus}
              onEdit={() => openEdit(p)}
              onDelete={() => setConfirmDelete(p._id)}
            />
          ))}
        </div>

        {/* CREATE / EDIT MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="sticky top-0 bg-white border-b border-slate-100 px-6 sm:px-8 py-5 flex justify-between items-center z-10 rounded-t-3xl">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Briefcase size={20} className="text-indigo-600"/>
                  {editingProject ? "Edit Project" : "Launch New Project"}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20}/>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                {/* Title */}
                <Field label="Project Title" required error={errors.title}>
                  <input value={form.title} onChange={e => { setForm({...form, title: e.target.value}); setErrors({...errors, title:""}); }}
                    placeholder="e.g. ML-based Attendance System" className={inp(errors.title)}/>
                </Field>

                {/* Description */}
                <Field label="Project Description" required error={errors.description}>
                  <textarea rows={3} value={form.description} onChange={e => { setForm({...form, description: e.target.value}); setErrors({...errors, description:""}); }}
                    placeholder="Describe the project objectives…" className={`${inp(errors.description)} resize-none`}/>
                </Field>

                {/* Branches */}
                <Field label="Eligible Branches" required error={errors.branches}>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.branchesOpenToAll ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                      {form.branchesOpenToAll && <Check size={12} className="text-white" strokeWidth={3}/>}
                    </span>
                    <input type="checkbox" className="hidden" checked={form.branchesOpenToAll}
                      onChange={e => { setForm({...form, branchesOpenToAll: e.target.checked, branches: []}); setErrors({...errors, branches:""}); }}/>
                    <span className="text-sm font-bold text-slate-700">Open to All Branches</span>
                  </label>
                  <MultiSelect
                    options={BRANCHES}
                    selected={form.branches}
                    onChange={v => { setForm({...form, branches: v}); setErrors({...errors, branches:""}); }}
                    placeholder="Select eligible branches…"
                    disabled={form.branchesOpenToAll}
                    error={errors.branches}
                  />
                  {/* Selected chips */}
                  {form.branches.length > 0 && !form.branchesOpenToAll && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.branches.map(b => (
                        <span key={b} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full">
                          {b}
                          <button type="button" onClick={() => setForm({...form, branches: form.branches.filter(x => x !== b)})} className="hover:text-red-500"><X size={11}/></button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                {/* Batches */}
                <Field label="Eligible Batches" required error={errors.batches}>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${form.batchesOpenToAll ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                      {form.batchesOpenToAll && <Check size={12} className="text-white" strokeWidth={3}/>}
                    </span>
                    <input type="checkbox" className="hidden" checked={form.batchesOpenToAll}
                      onChange={e => { setForm({...form, batchesOpenToAll: e.target.checked, batches: []}); setErrors({...errors, batches:""}); }}/>
                    <span className="text-sm font-bold text-slate-700">Open to All Batches</span>
                  </label>
                  <MultiSelect
                    options={BATCHES}
                    selected={form.batches}
                    onChange={v => { setForm({...form, batches: v}); setErrors({...errors, batches:""}); }}
                    placeholder="Select eligible batches…"
                    disabled={form.batchesOpenToAll}
                    error={errors.batches}
                  />
                  {form.batches.length > 0 && !form.batchesOpenToAll && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.batches.map(b => (
                        <span key={b} className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full">
                          {b}
                          <button type="button" onClick={() => setForm({...form, batches: form.batches.filter(x => x !== b)})} className="hover:text-red-500"><X size={11}/></button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Minimum CPI"  required error={errors.cpi}>
                    <input type="number" step="0.01" min="0" max="10" value={form.cpi}
                      onChange={e => { setForm({...form, cpi: e.target.value}); setErrors({...errors, cpi:""}); }}
                      placeholder="e.g. 7.5" className={inp(errors.cpi)}/>
                  </Field>
                  <Field label="Duration" >
                    <input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                      placeholder="e.g. 2 months" className={inp()}/>
                  </Field>
                </div>

                <Field label="Required Skills">
                  <input value={form.skills} onChange={e => setForm({...form, skills: e.target.value})}
                    placeholder="e.g. Python, TensorFlow, React" className={inp()}/>
                </Field>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm">Cancel</button>
                  <button onClick={saveProject} disabled={loading}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95">
                    {loading ? "Saving…" : editingProject ? "Save Changes" : "🚀 Launch Project"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const inp = (err) =>
  `w-full bg-slate-50 border-2 ${err ? "border-red-400" : "border-slate-200 focus:border-indigo-500"} rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-slate-700`;

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-700 mb-1 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="normal-case font-medium text-slate-400 ml-1">— {hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
    </div>
  );
}

// ── Project Card (with per-project applicant filters) ────────────────────────
function ProjectCard({ project, updateAppStatus, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterBranches, setFilterBranches] = useState([]);
  const [filterBatches, setFilterBatches] = useState([]);
  const [filterMinCpi, setFilterMinCpi] = useState("");
  const [sortCpi, setSortCpi] = useState("none"); // "asc" | "desc" | "none"

  // Unique branches & batches from actual applicants
  const uniqueBranches = [...new Set((project.applicants || []).map(a => a.branch).filter(Boolean))];
  const uniqueBatches  = [...new Set((project.applicants || []).map(a => a.batch).filter(Boolean))];

  let displayed = (project.applicants || []).filter(app => {
    if (filterBranches.length > 0 && !filterBranches.includes(app.branch)) return false;
    if (filterBatches.length > 0 && !filterBatches.includes(app.batch)) return false;
    if (filterMinCpi !== "" && parseFloat(app.cpi) < parseFloat(filterMinCpi)) return false;
    return true;
  });
  if (sortCpi === "desc") displayed = [...displayed].sort((a, b) => b.cpi - a.cpi);
  if (sortCpi === "asc")  displayed = [...displayed].sort((a, b) => a.cpi - b.cpi);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex justify-between items-start gap-4 mb-3">
          <div className="flex-1">
            <h3 className="text-xl font-extrabold text-slate-800">{project.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{project.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onEdit} className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors" title="Edit project">
              <Pencil size={16}/>
            </button>
            <button onClick={onDelete} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Delete project">
              <Trash2 size={16}/>
            </button>
            <div className="text-right ml-2">
              <p className="text-[10px] font-black text-slate-400 uppercase">Min CPI</p>
              <p className="text-xl font-black text-indigo-600">{project.cpi === 0 ? "Open" : `${project.cpi}+`}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-slate-100 mt-2">
          <InfoBlock icon={<GitBranch size={13}/>} label="Branches" value={(project.branches || []).includes("ALL") ? "All Branches" : (project.branches || []).join(", ") || "—"}/>
          <InfoBlock icon={<CalendarRange size={13}/>} label="Batches" value={(project.batches || []).includes("ALL") ? "All Batches" : (project.batches || []).join(", ") || "—"}/>
          <InfoBlock icon={<Clock size={13}/>} label="Duration" value={project.duration || "—"}/>
          <InfoBlock icon={<Code2 size={13}/>} label="Skills" value={project.skills || "—"}/>
        </div>

        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full mt-4 flex items-center justify-between group py-2">
          <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
            {isExpanded ? "Hide Applicants" : `View Applicants (${project.applicants?.length || 0})`}
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-slate-50 border-t border-slate-100 p-4 sm:p-6 space-y-4">
          {/* Per-project filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-3 items-center">
            <Filter size={15} className="text-slate-400 shrink-0"/>
            <div className="flex-1 min-w-[160px]">
              <MultiSelect options={uniqueBranches.length > 0 ? uniqueBranches : BRANCHES}
                selected={filterBranches} onChange={setFilterBranches} placeholder="Filter by branch…"/>
            </div>
            <div className="flex-1 min-w-[140px]">
              <MultiSelect options={uniqueBatches.length > 0 ? uniqueBatches : BATCHES}
                selected={filterBatches} onChange={setFilterBatches} placeholder="Filter by batch…"/>
            </div>
            <input type="number" min="0" max="10" step="0.1" value={filterMinCpi}
              onChange={e => setFilterMinCpi(e.target.value)}
              placeholder="Min CPI ≥"
              className="px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-bold w-28"/>
            <button
              onClick={() => setSortCpi(s => s === "desc" ? "asc" : s === "asc" ? "none" : "desc")}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${sortCpi !== "none" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-500 hover:border-indigo-400"}`}
            >
              <ArrowUpDown size={13}/>
              CPI {sortCpi === "desc" ? "↓ High" : sortCpi === "asc" ? "↑ Low" : "Sort"}
            </button>
            {(filterBranches.length > 0 || filterBatches.length > 0 || filterMinCpi || sortCpi !== "none") && (
              <button onClick={() => { setFilterBranches([]); setFilterBatches([]); setFilterMinCpi(""); setSortCpi("none"); }}
                className="text-xs font-bold text-red-500 hover:underline">Clear</button>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  {["Roll No","Name","Branch","Batch","CPI","Resume","Action"].map(h => (
                    <th key={h} className="px-5 py-3.5 font-black uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayed.length > 0 ? displayed.map(app => (
                  <tr key={app._id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-medium text-slate-600 text-xs">{app.rollNo}</td>
                    <td className="px-5 py-4 font-bold text-slate-900 text-sm">{app.name}</td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{app.branch}</td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{app.batch}</td>
                    <td className="px-5 py-4 font-bold text-indigo-600 text-sm">{app.cpi}</td>
                    <td className="px-5 py-4 text-center">
                      <a href={app.resume} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline text-xs">View PDF</a>
                    </td>
                    <td className="px-5 py-4">
                      {app.status === "Pending" ? (
                        <div className="flex gap-2">
                          <button onClick={() => updateAppStatus(app._id, "Accepted")}
                            className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors">
                            <Check size={15}/>
                          </button>
                          <button onClick={() => updateAppStatus(app._id, "Rejected")}
                            className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-600 hover:text-white flex items-center justify-center transition-colors">
                            <X size={15}/>
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${app.status === "Accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{app.status}</span>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="7" className="px-5 py-10 text-center text-slate-400 italic text-sm">
                    {project.applicants?.length === 0 ? "No applications yet." : "No applicants match the current filters."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            {displayed.length > 0 ? displayed.map(app => (
              <div key={app._id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-slate-400 font-black uppercase mb-0.5">Roll No</p><p className="font-bold text-slate-800">{app.rollNo}</p></div>
                  <div><p className="text-slate-400 font-black uppercase mb-0.5">CPI</p><p className="font-bold text-indigo-600">{app.cpi}</p></div>
                  <div><p className="text-slate-400 font-black uppercase mb-0.5">Branch</p><p className="font-medium text-slate-600">{app.branch}</p></div>
                  <div><p className="text-slate-400 font-black uppercase mb-0.5">Batch</p><p className="font-medium text-slate-600">{app.batch}</p></div>
                </div>
                <div className="border-t border-slate-100 pt-2">
                  <p className="text-slate-400 font-black uppercase text-xs mb-0.5">Name</p>
                  <p className="font-bold text-slate-800 text-sm">{app.name}</p>
                </div>
                <a href={app.resume} target="_blank" rel="noreferrer" className="block text-center text-indigo-600 font-bold text-xs bg-indigo-50 py-2 rounded-lg hover:underline">View Resume</a>
                {app.status === "Pending" ? (
                  <div className="flex gap-2 border-t border-slate-100 pt-2">
                    <button onClick={() => updateAppStatus(app._id, "Accepted")} className="flex-1 py-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg font-bold text-sm flex items-center justify-center gap-1"><Check size={15}/>Accept</button>
                    <button onClick={() => updateAppStatus(app._id, "Rejected")} className="flex-1 py-2 bg-red-100 text-red-600 hover:bg-red-600 hover:text-white rounded-lg font-bold text-sm flex items-center justify-center gap-1"><X size={15}/>Reject</button>
                  </div>
                ) : (
                  <div className={`text-center font-bold text-sm py-2 rounded-lg border-t border-slate-100 pt-2 ${app.status === "Accepted" ? "text-emerald-700" : "text-red-600"}`}>{app.status}</div>
                )}
              </div>
            )) : (
              <div className="text-center text-slate-400 italic py-6 text-sm">
                {project.applicants?.length === 0 ? "No applications yet." : "No applicants match the current filters."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ icon, label, value }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest font-black text-slate-400 mb-1 flex items-center gap-1">{icon}{label}</p>
      <p className="text-xs font-bold text-slate-700 line-clamp-2">{value}</p>
    </div>
  );
}

export default ProfessorProject;
