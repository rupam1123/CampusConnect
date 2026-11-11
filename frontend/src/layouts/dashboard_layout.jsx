// src/layouts/dashboard_layout.jsx
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  BarChart3,
  LogOut,
  GraduationCap,
  BookOpen,
  UserCircle,
  Settings,
  Lock,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Menu,
} from "lucide-react";

import { API_BASE, HOSTED } from "../lib/api";

function DashboardLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Form States
  const [identityInput, setIdentityInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // NEW: State to track if we are showing the custom deletion confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {
    name: "User",
    role: "Student",
  };
  const role = user.role;
  const displayName = role === "Student" ? `@${user.username}` : user.name;
  const initial =
    role === "Student"
      ? user.username?.charAt(0).toUpperCase()
      : user.name?.charAt(0).toUpperCase();

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const showMessage = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const closeDialogs = () => {
    setActiveDialog(null);
    setShowDeleteConfirm(false);
    setErrors({});
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIdentityInput("");
    setDeletePassword("");
  };

  const getStrengthScore = (pwd) => {
    let score = 0;
    if (pwd.length >= 1) score = 1;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    return score;
  };
  const strengthScore = getStrengthScore(newPassword);

  const handleUpdateIdentity = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/users/identity`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ newIdentity: identityInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      localStorage.setItem("user", JSON.stringify(data.user));
      showMessage("Profile updated!");
      closeDialogs();
    } catch (err) {
      setErrors({ identity: err.message });
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const pwdErrors = {};
    if (strengthScore < 3) pwdErrors.password = "Weak password.";
    if (!confirmPassword) pwdErrors.confirmPassword = "Please confirm your password";
    if (newPassword !== confirmPassword) pwdErrors.confirmPassword = "Passwords do not match";
    if (Object.keys(pwdErrors).length > 0) return setErrors(pwdErrors);
    try {
      const res = await fetch(`${API_BASE}/api/users/password`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      showMessage("Password changed!");
      closeDialogs();
      setNewPassword("");
      setConfirmPassword("");
      setCurrentPassword("");
    } catch (err) {
      setErrors({ current: err.message });
    }
  };

  // STEP 1: Verify password and show the custom confirmation UI
  const handleDeleteRequest = (e) => {
    e.preventDefault();
    if (!deletePassword) return;
    setErrors({});
    setShowDeleteConfirm(true); // Switch to the custom confirmation screen
  };

  // STEP 2: Actually execute the deletion
  const executeDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/users/delete`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();

      // If password was wrong, it throws an error and drops us back to the password screen
      if (!res.ok) throw new Error(data.msg);

      localStorage.clear();
      navigate("/login");
    } catch (err) {
      setErrors({ delete: err.message });
      setShowDeleteConfirm(false); // Go back to password entry on error
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    if (HOSTED) { window.location.assign('/signout-with-chatgpt?return_to=/login'); return; }
    navigate("/login");
  };


  const studentMenu = [
    { name: "Courses", path: "/courses", icon: <BookOpen size={20} /> },
    { name: "Projects", path: "/projects", icon: <Briefcase size={20} /> },
    { name: "Forum", path: "/forum", icon: <MessageSquare size={20} /> },
  ];

  const professorMenu = [
    { name: "Courses", path: "/courses", icon: <BookOpen size={20} /> },
    {
      name: "Manage Courses",
      path: "/manage-courses",
      icon: <BookOpen size={20} />,
    },
    {
      name: "Manage Projects",
      path: "/professor-projects",
      icon: <Briefcase size={20} />,
    },
    {
      name: "Analytics",
      path: "/professor-dashboard",
      icon: <BarChart3 size={20} />,
    },
    { name: "Forum", path: "/forum", icon: <MessageSquare size={20} /> },
  ];

  const menu = role === "Professor" ? professorMenu : studentMenu;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[250] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in slide-in-from-top-4 fade-in duration-300 ${toast.type === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={20} />
          ) : (
            <CheckCircle2 size={20} />
          )}
          <span className="font-bold">{toast.msg}</span>
        </div>
      )}

      {/* SIDEBAR - Hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex md:w-72 bg-slate-900 text-slate-300 flex-col shadow-2xl shrink-0 z-20">
        <div className="p-6 mb-2 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap size={26} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black text-white tracking-tight truncate">
            Campus<span className="text-indigo-400">Connect</span>
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3">
            Main Menu
          </p>
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path, { state: { reset: true } })}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group border-2 ${
                  isActive ? "bg-indigo-600 text-white border-white shadow-lg shadow-indigo-900/50" : "border-transparent hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="opacity-70 group-hover:opacity-100">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* BOTTOM SECTION: LOGOUT */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE MENU OVERLAY - Visible only on mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* MOBILE MENU SIDEBAR - Slides in from left on mobile */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-50 transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 mb-2 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/30">
            <GraduationCap size={26} strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            Campus<span className="text-indigo-400">Connect</span>
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-3">
            Main Menu
          </p>
          {menu.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path, { state: { reset: true } }); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group border-2 ${
                  isActive ? "bg-indigo-600 text-white border-white shadow-lg shadow-indigo-900/50" : "border-transparent hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="opacity-70 group-hover:opacity-100">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* BOTTOM SECTION: LOGOUT */}
        <div className="p-4 border-t border-slate-800 mt-auto">
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVBAR - Responsive */}
        <header className="sticky top-0 z-40 h-16 sm:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 lg:px-8 shrink-0 gap-2">
          {/* LEFT: Hamburger Menu & Logo */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <Menu size={20} />
            </button>
            {/* Campus Connect Logo - Visible on Mobile */}
            <div className="md:hidden flex items-center gap-1.5 min-w-0">
              <div className="p-1.5 bg-indigo-600 rounded-lg text-white flex-shrink-0">
                <GraduationCap size={18} strokeWidth={2.5} />
              </div>
              <span className="text-sm font-black text-slate-900 tracking-tight truncate">
                Campus<span className="text-indigo-600">Connect</span>
              </span>
            </div>
          </div>

          {/* RIGHT: User Menu - Always Visible */}
          <div className="flex items-center gap-2 sm:gap-3 ml-auto relative" ref={dropdownRef}>
            {/* User Info - Show on all screens */}
            <div className="text-right">
              <p className="text-xs sm:text-sm font-black text-slate-900 leading-none line-clamp-1">
                {displayName}
              </p>
              <p className="text-[8px] sm:text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                {role}
              </p>
            </div>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 sm:w-12 h-10 sm:h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg sm:text-xl shadow-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
            >
              {initial}
            </button>

            {dropdownOpen && (
              <div className="absolute top-14 sm:top-16 right-0 w-48 sm:w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[100] animate-in fade-in zoom-in-95 max-h-[60vh] overflow-y-auto">
                <button
                  onClick={() => {
                    setActiveDialog("ID");
                    setIdentityInput(
                      role === "Student" ? user.username : user.name,
                    );
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Settings size={16} className="text-slate-400 flex-shrink-0" /> Update Profile
                </button>
                <button
                  onClick={() => {
                    if (HOSTED) { showMessage('Your sign-in is managed by your ChatGPT account. Manage your password there.'); setDropdownOpen(false); return; }
                    setActiveDialog("PWD");
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Lock size={16} className="text-slate-400 flex-shrink-0" /> Change Password
                </button>
                <button
                  onClick={() => {
                    setActiveDialog("DEL");
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Trash2 size={16} className="text-red-400 flex-shrink-0" /> Delete Account
                </button>

                {/* DROPDOWN LOGOUT */}
                <div className="my-1 border-t border-slate-100"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap"
                >
                  <LogOut size={16} className="text-slate-400 flex-shrink-0" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 relative">
          {children}

          {/* DIALOG MODALS */}
          {activeDialog && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                {/* Header changes color if we are confirming deletion */}
                <div
                  className={`p-6 border-b flex justify-between items-center transition-colors ${showDeleteConfirm ? "bg-red-50 border-red-100" : "bg-slate-50/50 border-slate-100"}`}
                >
                  <h3
                    className={`font-black flex items-center gap-2 text-lg sm:text-xl ${showDeleteConfirm ? "text-red-600" : "text-slate-900"}`}
                  >
                    {showDeleteConfirm && <AlertTriangle size={20} />}
                    {activeDialog === "ID"
                      ? "Edit Profile"
                      : activeDialog === "PWD"
                        ? "Security"
                        : showDeleteConfirm
                          ? "Final Warning"
                          : "Dangerous Action"}
                  </h3>
                  <button
                    onClick={closeDialogs}
                    className="p-2 hover:bg-slate-200 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>

                {activeDialog === "ID" && (
                  <form
                    onSubmit={handleUpdateIdentity}
                    className="p-6 sm:p-8 space-y-6"
                  >
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-2 ml-1">
                        New {role === "Student" ? "Anonymous Name" : "Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={identityInput}
                        onChange={(e) => setIdentityInput(e.target.value)}
                        className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-bold"
                      />
                      {errors.identity && (
                        <p className="text-red-500 text-xs mt-2 font-bold">
                          {errors.identity}
                        </p>
                      )}
                    </div>
                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">
                      Save Changes
                    </button>
                  </form>
                )}

                {activeDialog === "PWD" && (
                  <form
                    onSubmit={handleUpdatePassword}
                    className="p-6 sm:p-8 space-y-6"
                  >
                    <input
                      type="password"
                      required
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold"
                    />
                    {errors.current && (
                      <p className="text-red-500 text-xs font-bold">
                        {errors.current}
                      </p>
                    )}

                    <div className="relative group overflow-hidden rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New Password"
                        className={`w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 rounded-xl outline-none font-medium text-slate-700 pb-4 ${errors.password ? "border-red-500" : "border-slate-200 focus:border-indigo-500"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl pb-1"
                      >
                        {showPassword ? "🐵" : "🙈"}
                      </button>
                      {newPassword.length > 0 && (
                        <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full flex">
                          <div
                            className={`h-full transition-all duration-300 ${strengthScore === 1 ? "w-1/3 bg-red-500" : strengthScore === 2 ? "w-2/3 bg-yellow-500" : "w-full bg-green-500"}`}
                          ></div>
                        </div>
                      )}
                    </div>
                    {errors.password && (
                      <p className="text-red-500 text-xs font-bold">
                        {errors.password}
                      </p>
                    )}

                    <div className="relative group overflow-hidden rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
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
                        placeholder="Confirm Password"
                        className={`w-full pl-11 pr-12 py-3.5 bg-slate-50 border-2 rounded-xl outline-none font-medium text-slate-700 pb-4 ${errors.confirmPassword ? "border-red-500" : "border-slate-200 focus:border-indigo-500"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-2xl pb-1"
                      >
                        {showConfirmPassword ? "🐵" : "🙈"}
                      </button>
                      {confirmPassword.length > 0 && (
                        <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full flex">
                          <div
                            className={`h-full transition-all duration-300 ${getStrengthScore(confirmPassword) === 1 ? "w-1/3 bg-red-500" : getStrengthScore(confirmPassword) === 2 ? "w-2/3 bg-yellow-500" : "w-full bg-green-500"}`}
                          ></div>
                        </div>
                      )}
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs font-bold">
                        {errors.confirmPassword}
                      </p>
                    )}

                    <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black">
                      Change Password
                    </button>
                  </form>
                )}

                {activeDialog === "DEL" &&
                  (!showDeleteConfirm ? (
                    /* Step 1: Enter Password */
                    <form
                      onSubmit={handleDeleteRequest}
                      className="p-6 sm:p-8 space-y-6 bg-red-50/20 animate-in fade-in"
                    >
                      <p className="text-red-600 font-bold text-sm">
                        Your profile will be anonymized and your enrollments and applications removed. Public discussion history remains. {HOSTED ? 'Type DELETE to continue.' : 'Confirm your password to continue.'}
                      </p>
                      <input
                        type={HOSTED ? 'text' : 'password'}
                        required
                        placeholder={HOSTED ? 'Type DELETE' : 'Confirm Password'}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="w-full p-4 bg-white border-2 border-red-200 rounded-2xl font-bold outline-none focus:border-red-600"
                      />
                      {errors.delete && (
                        <p className="text-red-500 text-xs font-bold">
                          {errors.delete}
                        </p>
                      )}
                      <button
                        type="submit"
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-lg transition-all active:scale-95"
                      >
                        Initiate Deletion
                      </button>
                    </form>
                  ) : (
                    /* Step 2: Custom Beautiful Confirmation Overlay */
                    <div className="p-6 sm:p-8 space-y-6 bg-red-50 text-center animate-in slide-in-from-right-8 duration-300">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle size={32} />
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        Are you absolutely sure?
                      </h4>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        This action cannot be undone. All your personal data
                        will be anonymized or permanently erased from the
                        server.
                      </p>

                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-4 font-bold text-slate-600 hover:bg-slate-200 rounded-2xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={executeDelete}
                          className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-200 transition-all active:scale-95"
                        >
                          Yes, Delete It
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
