// src/pages/ProfessorDashboard.jsx
import { useState, useEffect } from "react";
import DashboardLayout from "../layouts/dashboard_layout";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  BarChart3,
  AlertCircle,
  MessageSquareQuote,
  TrendingUp,
} from "lucide-react";

// Register both Bar and Line elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

import { API_BASE, readJson } from "../lib/api";

export default function ProfessorDashboard() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/courses/managed`, { headers: getHeaders() })
      .then(readJson)
      .then((data) => setCourses(data))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    let active = true;
    fetch(`${API_BASE}/api/engage/course/${selectedCourse}/analytics`, {
      headers: getHeaders(),
    })
      .then(readJson)
      .then((data) => {
        if (!active) return;
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error(err);
        setLoading(false);
      });
    return () => { active = false; };
  }, [selectedCourse]);

  // BAR CHART: Categorical Metrics
  const barData = {
    labels: ["Content", "Delivery", "Clarity", "Engagement", "Pace"],
    datasets: [
      {
        label: "Average Rating (Out of 5)",
        data: analytics?.available
          ? [
              analytics.averages.content,
              analytics.averages.delivery,
              analytics.averages.clarity,
              analytics.averages.engagement,
              analytics.averages.pace,
            ]
          : [],
        backgroundColor: "#4f46e5",
        borderRadius: 8,
      },
    ],
  };

  // TREND LINE: Feedback Over Time
  const lineData = {
    labels: analytics?.trend?.labels || [],
    datasets: [
      {
        label: "Avg Session Score",
        data: analytics?.trend?.data || [],
        borderColor: "#10b981", // Emerald 500
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#10b981",
        pointBorderWidth: 2,
        pointRadius: 5,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, max: 5 } },
    plugins: { legend: { display: false } },
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-5rem)] font-sans relative pb-10 px-0">
        <div className="mb-8 sm:mb-10 animate-in fade-in px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-indigo-600 rounded-xl sm:rounded-2xl text-white shadow-xl shadow-indigo-200 flex-shrink-0">
              <BarChart3 size={24} strokeWidth={2.5} />
            </div>
            <span>Course Analytics & Insights</span>
          </h1>
          <p className="text-slate-500 font-medium mt-2 sm:mt-3 ml-0 sm:ml-14 text-sm sm:text-base">
            Process and visualize anonymous student feedback data.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-6">
          {/* LEFT: CHARTS */}
          <div className="xl:col-span-2 space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 text-[10px] sm:text-xs">
                Select Active Course
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => { setSelectedCourse(e.target.value); setAnalytics(null); setLoading(!!e.target.value); }}
                className="w-full p-3 sm:p-5 bg-slate-50 border-2 border-transparent rounded-lg sm:rounded-[1.25rem] outline-none focus:border-indigo-500 font-black text-slate-800 shadow-inner appearance-none cursor-pointer text-sm sm:text-base"
                style={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                <option value="">-- Choose a Course to Analyze --</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600"></div>
              </div>
            ) : analytics && !analytics.available ? (
              <div className="bg-white rounded-[2.5rem] border-4 border-dashed border-slate-100 p-16 text-center flex flex-col items-center">
                <AlertCircle size={48} className="text-slate-300 mb-4" />
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  No Data Available
                </h3>
                <p className="text-slate-500 font-medium mt-2">
                  Students have not submitted feedback for this course yet.
                </p>
              </div>
            ) : analytics?.available ? (
              <div className="space-y-8">
                {/* Categorical Bar Chart */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-[400px]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">
                      Categorical Metrics
                    </h3>
                    <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest">
                      {analytics.count} Responses
                    </span>
                  </div>
                  <div className="h-[280px] w-full">
                    <Bar data={barData} options={chartOptions} />
                  </div>
                </div>

                {/* Time Trend Line Chart */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm h-[400px]">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="font-black text-slate-900 text-xl tracking-tight">
                      Feedback Trends Over Time
                    </h3>
                  </div>
                  <div className="h-[280px] w-full">
                    <Line data={lineData} options={chartOptions} />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* RIGHT: WRITTEN REMARKS */}
          <div className="xl:col-span-1 animate-in slide-in-from-right-4">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl h-full min-h-[700px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -ml-20 -mt-20 pointer-events-none"></div>

              <div className="relative z-10">
                <div className="p-3 bg-indigo-500/20 text-indigo-300 rounded-2xl w-fit mb-6 border border-indigo-500/30">
                  <MessageSquareQuote size={24} />
                </div>
                <h3 className="font-black text-3xl mb-2 tracking-tight">
                  Written Remarks
                </h3>
                <p className="text-slate-400 text-sm font-medium mb-8">
                  Anonymous feedback submissions across all sessions.
                </p>
              </div>

              <div className="relative z-10 flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {analytics?.available && analytics.comments.length > 0 ? (
                  analytics.comments.map((txt, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50 font-bold text-sm leading-relaxed text-slate-200 shadow-inner"
                    >
                      "{txt}"
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 py-10 font-bold border-2 border-dashed border-slate-800 rounded-2xl">
                    No written remarks submitted.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        select {
          position: relative;
          z-index: 10;
        }
        select:focus {
          outline: none;
        }
      `}</style>
    </DashboardLayout>
  );
}
