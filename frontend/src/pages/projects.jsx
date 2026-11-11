import { useState, useEffect, useRef } from "react";
import DashboardLayout from "../layouts/dashboard_layout";
import {
  Search, Clock, Award, User, Code2, X, Briefcase, CheckCircle,
  Filter, GitBranch, CalendarRange, AlertCircle, ChevronDown, Check,
} from "lucide-react";

import { API_BASE } from "../lib/api";

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

// ── Reusable multi-select dropdown (for filters) ─────────────────────────────
function MultiSelectFilter({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (opt) => onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-2 bg-white border-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
          ${selected.length > 0 ? "border-indigo-500 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-500 hover:border-indigo-400"}`}>
        {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto min-w-[240px]">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm font-medium text-slate-700">
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                ${selected.includes(opt) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}>
                {selected.includes(opt) && <Check size={11} className="text-white" strokeWidth={3}/>}
              </span>
              <input type="checkbox" className="hidden" checked={selected.includes(opt)} onChange={() => toggle(opt)}/>
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single-select dropdown (for apply form) ───────────────────────────────────
function SingleSelect({ options, value, onChange, placeholder, error }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 bg-slate-50 text-sm font-bold text-left transition-all
          ${error ? "border-red-400" : open ? "border-indigo-500 bg-white" : "border-slate-200 hover:border-indigo-400"}`}>
        <span className={value ? "text-slate-700" : "text-slate-400 font-medium"}>{value || placeholder}</span>
        <ChevronDown size={15} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}/>
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button key={opt} type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-indigo-50 hover:text-indigo-700 transition-colors
                ${value === opt ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-700"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function Projects() {
  const [projects, setProjects] = useState([]);
  const [myApplications, setMyApplications] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Global filters
  const [filterBranches, setFilterBranches] = useState([]);
  const [filterBatches, setFilterBatches] = useState([]);
  const [filterMinCpi, setFilterMinCpi] = useState("");

  const [applicationForm, setApplicationForm] = useState({
    rollNo: "", name: "", branch: "", batch: "", cpi: "", resume: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/projects`, { headers: getHeaders() })
      .then(r => r.json()).then(d => setProjects(Array.isArray(d) ? d : [])).catch(console.error);
    fetch(`${API_BASE}/api/projects/my-applications`, { headers: getHeaders() })
      .then(r => r.json()).then(data => {
        const map = {};
        data.forEach(a => { map[a.project] = a.status; });
        setMyApplications(map);
      }).catch(console.error);
  }, []);

  // Filter projects
  const filteredProjects = projects.filter(p => {
    const q = searchQuery.toLowerCase();
    if (q && !p.title.toLowerCase().includes(q) && !p.skills?.toLowerCase().includes(q)) return false;

    // branch filter: project must include at least one of selected branches (or be open to all)
    if (filterBranches.length > 0) {
      const isOpenBranch = (p.branches || []).includes("ALL");
      const hasMatch = isOpenBranch || filterBranches.some(fb => (p.branches || []).some(pb => pb.toLowerCase() === fb.toLowerCase()));
      if (!hasMatch) return false;
    }
    if (filterBatches.length > 0) {
      const isOpenBatch = (p.batches || []).includes("ALL");
      const hasMatch = isOpenBatch || filterBatches.some(fb => (p.batches || []).includes(fb));
      if (!hasMatch) return false;
    }
    if (filterMinCpi !== "" && parseFloat(filterMinCpi) > 0) {
      // student enters their CPI; hide projects where required CPI is above what they have
      if (p.cpi > parseFloat(filterMinCpi)) return false;
    }
    return true;
  });

  const validateForm = () => {
    const e = {};
    if (!applicationForm.rollNo.trim()) e.rollNo = "Roll number is required.";
    else if (!/^\d+$/.test(applicationForm.rollNo.trim())) e.rollNo = "Roll number must be digits only.";
    if (!applicationForm.name.trim()) e.name = "Name is required.";
    if (!applicationForm.branch) e.branch = "Please select your branch.";
    if (!applicationForm.batch) e.batch = "Please select your batch.";
    if (applicationForm.cpi === "") e.cpi = "CPI is required.";
    else if (parseFloat(applicationForm.cpi) < 0 || parseFloat(applicationForm.cpi) > 10) e.cpi = "CPI must be 0–10.";
    else if (selectedProject && parseFloat(applicationForm.cpi) < selectedProject.cpi)
      e.cpi = `Your CPI must be ≥ ${selectedProject.cpi} for this project.`;
    if (!applicationForm.resume.trim()) e.resume = "Resume link is required.";
    return e;
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setFormError("");
    const errs = validateForm();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${selectedProject._id}/apply`, {
        method: "POST", headers: getHeaders(), body: JSON.stringify(applicationForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setToastMessage("Application sent successfully!");
      setTimeout(() => setToastMessage(null), 3500);
      setMyApplications({ ...myApplications, [selectedProject._id]: "Pending" });
      setSelectedProject(null);
      setApplicationForm({ rollNo: "", name: "", branch: "", batch: "", cpi: "", resume: "" });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Branch options for the apply form: if project allows ALL, show all BRANCHES; else show project's list
  const applyBranchOptions = selectedProject
    ? ((selectedProject.branches || []).includes("ALL") ? BRANCHES : selectedProject.branches)
    : [];
  const applyBatchOptions = selectedProject
    ? ((selectedProject.batches || []).includes("ALL") ? BATCHES : selectedProject.batches)
    : [];

  const fi = (err) =>
    `w-full p-3 bg-slate-50 border-2 ${err ? "border-red-400" : "border-slate-200 focus:border-indigo-500"} rounded-xl outline-none text-sm font-bold text-slate-700 transition-all`;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in relative pb-10">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-4">
            <CheckCircle size={22}/><div><p className="text-xs font-black uppercase text-emerald-200">Success</p><p className="font-bold text-sm">{toastMessage}</p></div>
          </div>
        )}

        {/* Header + Search */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Board</h2>
            <p className="text-slate-500 mt-1">Discover and apply to research opportunities.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input type="text" placeholder="Search by title or skill…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-sm"/>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <Filter size={15} className="text-slate-400 shrink-0"/>
          <MultiSelectFilter options={BRANCHES} selected={filterBranches} onChange={setFilterBranches} placeholder="Branch"/>
          <MultiSelectFilter options={BATCHES}   selected={filterBatches}  onChange={setFilterBatches}  placeholder="Batch"/>
          <div className="flex items-center gap-2">
            <input type="number" min="0" max="10" step="0.1" value={filterMinCpi}
              onChange={e => setFilterMinCpi(e.target.value)}
              placeholder="Min CPI"
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-400 font-bold w-28"/>
          </div>
          
          {(filterBranches.length > 0 || filterBatches.length > 0 || filterMinCpi) && (
            <button onClick={() => { setFilterBranches([]); setFilterBatches([]); setFilterMinCpi(""); }} className="ml-auto text-xs font-bold text-red-500 hover:underline">Clear Filters</button>
          )}
        </div>

        {/* Filter chips */}
        {(filterBranches.length > 0 || filterBatches.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {filterBranches.map(b => (
              <span key={b} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">
                {b}<button onClick={() => setFilterBranches(filterBranches.filter(x => x !== b))}><X size={11}/></button>
              </span>
            ))}
            {filterBatches.map(b => (
              <span key={b} className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-100">
                {b}<button onClick={() => setFilterBatches(filterBatches.filter(x => x !== b))}><X size={11}/></button>
              </span>
            ))}
          </div>
        )}

        {/* Project Grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const status = myApplications[project._id];
              return (
                <div key={project._id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2 leading-tight">{project.title}</h3>
                  <p className="text-sm text-slate-500 mb-5 flex-1">{project.description}</p>

                  <div className="space-y-2 mb-5 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm font-medium">
                    <div className="flex items-center gap-2"><User size={14} className="text-indigo-500 shrink-0"/><span>{project.professor?.name || project.professor?.email || "Faculty"}</span></div>
                    <div className="flex items-start gap-2"><GitBranch size={14} className="text-indigo-500 shrink-0 mt-0.5"/><span className="leading-relaxed">{(project.branches || []).includes("ALL") ? "All Branches" : (project.branches || []).join(", ")}</span></div>
                    <div className="flex items-center gap-2"><CalendarRange size={14} className="text-indigo-500 shrink-0"/><span>{(project.batches || []).includes("ALL") ? "All Batches" : (project.batches || []).join(", ")}</span></div>
                    <div className="flex items-center gap-2"><Award size={14} className="text-indigo-500 shrink-0"/><span>Min CPI: <span className="font-extrabold text-indigo-700">{project.cpi === 0 ? "Open to all" : project.cpi}</span></span></div>
                    {project.duration && <div className="flex items-center gap-2"><Clock size={14} className="text-indigo-500 shrink-0"/><span>{project.duration}</span></div>}
                    {project.skills && <div className="flex items-center gap-2"><Code2 size={14} className="text-indigo-500 shrink-0"/><span className="truncate">{project.skills}</span></div>}
                  </div>

                  {status ? (
                    <div className={`w-full py-3 rounded-xl font-bold text-center border-2 text-sm ${status === "Accepted" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : status === "Rejected" ? "bg-red-50 border-red-200 text-red-600" : "bg-blue-50 border-blue-200 text-blue-600"}`}>
                      Status: {status}
                    </div>
                  ) : (
                    <button onClick={() => { setSelectedProject(project); setFieldErrors({}); setFormError(""); setApplicationForm({ rollNo:"", name:"", branch:"", batch:"", cpi:"", resume:"" }); }}
                      className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm">
                      <Briefcase size={16}/> Apply Now
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <h3 className="text-lg font-bold text-slate-700">No projects found</h3>
            <p className="text-slate-400 mt-1 text-sm">Try adjusting your search or filters.</p>
          </div>
        )}

        {/* Apply Modal */}
        {selectedProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10 rounded-t-3xl">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">{selectedProject.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    by {selectedProject.professor?.name || "Professor"} · Min CPI: <span className="font-extrabold text-indigo-600">{selectedProject.cpi === 0 ? "Open to all" : selectedProject.cpi}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(selectedProject.branches || []).includes("ALL")
                      ? <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">All Branches</span>
                      : (selectedProject.branches || []).map(b => <span key={b} className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{b}</span>)
                    }
                    {(selectedProject.batches || []).includes("ALL")
                      ? <span className="text-[10px] font-black bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">All Batches</span>
                      : (selectedProject.batches || []).map(b => <span key={b} className="text-[10px] font-black bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{b}</span>)
                    }
                  </div>
                </div>
                <button onClick={() => setSelectedProject(null)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full shrink-0"><X size={20}/></button>
              </div>

              <form onSubmit={handleApply} className="p-6 space-y-4" noValidate>
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16}/>{formError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <AppField label="Roll No" required error={fieldErrors.rollNo} >
                    <input type="text" value={applicationForm.rollNo}
                      onChange={e => { setApplicationForm({...applicationForm, rollNo: e.target.value}); setFieldErrors({...fieldErrors, rollNo:""}); }}
                      placeholder="e.g. 220101" className={fi(fieldErrors.rollNo)}/>
                  </AppField>
                  <AppField label="Full Name" required error={fieldErrors.name}>
                    <input type="text" value={applicationForm.name}
                      onChange={e => { setApplicationForm({...applicationForm, name: e.target.value}); setFieldErrors({...fieldErrors, name:""}); }}
                      placeholder="Your full name" className={fi(fieldErrors.name)}/>
                  </AppField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <AppField label="Branch" required error={fieldErrors.branch}>
                    <SingleSelect
                      options={applyBranchOptions}
                      value={applicationForm.branch}
                      onChange={v => { setApplicationForm({...applicationForm, branch: v}); setFieldErrors({...fieldErrors, branch:""}); }}
                      placeholder="Select your branch…"
                      error={fieldErrors.branch}
                    />
                  </AppField>
                  <AppField label="Batch" required error={fieldErrors.batch}>
                    <SingleSelect
                      options={applyBatchOptions}
                      value={applicationForm.batch}
                      onChange={v => { setApplicationForm({...applicationForm, batch: v}); setFieldErrors({...fieldErrors, batch:""}); }}
                      placeholder="Select your batch…"
                      error={fieldErrors.batch}
                    />
                  </AppField>
                </div>

                <AppField label="Current CPI" required error={fieldErrors.cpi} >
                  <input type="number" step="0.01" min="0" max="10" value={applicationForm.cpi}
                    onChange={e => { setApplicationForm({...applicationForm, cpi: e.target.value}); setFieldErrors({...fieldErrors, cpi:""}); }}
                    placeholder="0.00 – 10.00" className={fi(fieldErrors.cpi)}/>
                </AppField>

                <AppField label="Resume Link (URL)" required error={fieldErrors.resume}>
                  <input type="url" value={applicationForm.resume}
                    onChange={e => { setApplicationForm({...applicationForm, resume: e.target.value}); setFieldErrors({...fieldErrors, resume:""}); }}
                    placeholder="https://drive.google.com/…" className={fi(fieldErrors.resume)}/>
                </AppField>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button type="button" onClick={() => setSelectedProject(null)} className="flex-1 px-4 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold shadow-lg text-sm transition-all active:scale-95">
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function AppField({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="block text-[11px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="normal-case font-medium text-slate-400 ml-1">— {hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-bold mt-1 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
    </div>
  );
}

export default Projects;
