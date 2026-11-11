// src/pages/CourseViewer.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronRight,
  BookOpen,
  ArrowLeft,
  Clock,
  Lock,
  GraduationCap,
  MessageSquare,
} from "lucide-react";
import DashboardLayout from "../layouts/dashboard_layout";

import { API_BASE, readJson } from "../lib/api";

export default function CourseViewer() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(() => window.history.state?.usr?.openCourseId || null);
  const selectedCourse = courses.find(course => course._id === selectedCourseId) || null;
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});  // { sessionId: count }
  const [courseUnread, setCourseUnread] = useState({});  // { courseId: totalCount }

  const navigate = useNavigate();
  const role = JSON.parse(localStorage.getItem("user"))?.role || "Student";
  const fetchUrl = role === "Professor" ? "/api/courses/managed" : "/api/courses/enrolled";

  const today = new Date();
  today.setHours(0, 0, 0, 0);


  const token = localStorage.getItem("token");
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Fetch courses list
  useEffect(() => {
    fetch(`${API_BASE}${fetchUrl}`, { headers: authHeaders })
      .then(readJson)
      .then((data) => { setCourses(data); setLoading(false); })
      .catch((err) => { console.error(err); setLoading(false); });
  }, [fetchUrl, authHeaders]);

  // When showing course list: fetch aggregate unread per course
  useEffect(() => {
    if (courses.length === 0 || selectedCourse) return;
    Promise.all(
      courses.map(async (c) => {
        try {
          const res = await fetch(`${API_BASE}/api/courses/${c._id}/sessions/unread-counts`, {
            headers: authHeaders,
          });
          if (!res.ok) return { id: c._id, total: 0 };
          const data = await res.json();
          const total = Object.values(data).reduce((s, n) => s + n, 0);
          return { id: c._id, total };
        } catch { return { id: c._id, total: 0 }; }
      })
    ).then((results) => {
      const map = {};
      results.forEach(({ id, total }) => { map[id] = total; });
      setCourseUnread(map);
    });
  }, [courses, selectedCourse, authHeaders]);

  const handleSelectCourse = (course) => { setSelectedCourseId(course._id); setUnreadCounts({}); };

  useEffect(() => {
    if (!selectedCourseId) return;
    let active = true;
    fetch(API_BASE + '/api/courses/' + selectedCourseId + '/sessions', {headers: authHeaders})
      .then(readJson).then(data => { if (active) setSessions(data); }).catch(console.error);
    fetch(API_BASE + '/api/courses/' + selectedCourseId + '/sessions/unread-counts', {headers: authHeaders})
      .then(readJson).then(data => { if (active) setUnreadCounts(data); }).catch(console.error);
    return () => { active = false; };
  }, [selectedCourseId, authHeaders]);

  const handleOpenSession = (session) => {
    // Optimistically clear badge immediately
    setUnreadCounts(prev => ({ ...prev, [session._id]: 0 }));
    navigate(`/sessions/${session._id}`, { state: { courseId: selectedCourse._id } });
  };

  const totalCourseUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0);

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-5rem)] font-sans">
        {selectedCourse ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={() => { setSelectedCourseId(null); setSessions([]); }}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 group transition-colors"
            >
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-200 shadow-sm">
                <ArrowLeft size={16} />
              </div>
              Back to My Courses
            </button>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 lg:p-8 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{selectedCourse.name}</h1>
                  {(selectedCourse.professor || selectedCourse.coInstructors?.length > 0) && (
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                      <GraduationCap size={18} className="text-indigo-500" />
                      {[
                        selectedCourse.professor?.name || selectedCourse.professor?.username || selectedCourse.professor?.email,
                        ...(selectedCourse.coInstructors?.map(ci => ci.name || ci.username || ci.email) || [])
                      ].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {totalCourseUnread > 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-full text-xs font-black shrink-0">
                    <MessageSquare size={13} /> {totalCourseUnread} unread
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sessions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-dashed border-slate-300">
                  No sessions generated for this course yet.
                </div>
              ) : (
                sessions.map((session, index) => {
                  const dateObj = new Date(session.date);
                  const sessionMidnight = new Date(session.date);
                  sessionMidnight.setHours(0, 0, 0, 0);
                  const isFuture = sessionMidnight > today;
                  const unread = !isFuture ? (unreadCounts[session._id] || 0) : 0;

                  return (
                    <div
                      key={session._id}
                      onClick={() => { if (!isFuture) handleOpenSession(session); }}
                      className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between transition-all group relative
                        ${isFuture
                          ? "opacity-60 cursor-not-allowed border-slate-100 grayscale-[50%]"
                          : "hover:shadow-md hover:border-indigo-300 cursor-pointer border-slate-200"
                        }`}
                    >
                      {unread > 0 && (
                        <span className="absolute top-3 right-10 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                          {unread}
                        </span>
                      )}

                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold border
                          ${isFuture ? "bg-slate-50 text-slate-400 border-slate-200" : "bg-indigo-50 text-indigo-600 border-indigo-100"}`}>
                          <span className="text-[10px] uppercase tracking-wider">
                            {dateObj.toLocaleString("en-US", { weekday: "short" })}
                          </span>
                          <span className="text-xl leading-none mt-0.5">{dateObj.getDate()}</span>
                        </div>
                        <div>
                          <h4 className={`font-extrabold text-lg flex items-center gap-2 ${unread > 0 ? "text-indigo-700" : "text-slate-800"}`}>
                            Lecture {index + 1}
                            {unread > 0 && <MessageSquare size={14} className="text-red-500" />}
                          </h4>
                          <p className="text-xs font-medium text-slate-500">
                            {dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>

                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                        ${isFuture ? "bg-slate-100" : "bg-slate-50 group-hover:bg-indigo-100"}`}>
                        {isFuture
                          ? <Lock size={16} className="text-slate-400" />
                          : <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-600" />
                        }
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <BookOpen className="text-indigo-600" size={32} /> My Courses
              </h1>
              <p className="text-slate-500 font-medium mt-1 ml-11">
                Select a course to view its schedule and sessions.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.length === 0 && <p className="col-span-full rounded-2xl border border-dashed p-10 text-center text-slate-500">{role === "Professor" ? "No courses yet. Open Manage Courses to create your first course." : "You are not enrolled in a course yet. Ask your professor to add your Gmail address."}</p>}
                {courses.map((c) => {
                  const totalUnread = courseUnread[c._id] || 0;
                  return (
                    <div
                      key={c._id}
                      onClick={() => handleSelectCourse(c)}
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 cursor-pointer transition-all group relative"
                    >
                      {totalUnread > 0 && (
                        <span className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full flex items-center gap-1">
                          <MessageSquare size={10} /> {totalUnread}
                        </span>
                      )}

                      <h3 className="text-xl font-extrabold text-slate-900 line-clamp-1 mb-3 pr-12">{c.name}</h3>
                      <div className="space-y-3 mb-6">
                        {(c.professor || c.coInstructors?.length > 0) && (
                          <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              <GraduationCap size={16} />
                            </div>
                            <span className="truncate">
                              {[
                                c.professor?.name || c.professor?.username || c.professor?.email,
                                ...(c.coInstructors?.map(ci => ci.name || ci.username || ci.email) || [])
                              ].filter(Boolean).join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Calendar size={16} />
                          </div>
                          <span className="truncate">{c.daysOfWeek.join(", ")}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Clock size={16} />
                          </div>
                          <span>
                            {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm font-bold text-indigo-600 pt-4 border-t border-slate-100">
                        View Schedule <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
