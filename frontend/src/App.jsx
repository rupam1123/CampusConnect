import { lazy, Suspense } from 'react';
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// Auth & Admin
const Login = lazy(() => import('./pages/login.jsx'));
const Signup = lazy(() => import('./pages/signup.jsx'));
const Forgot = lazy(() => import('./pages/forgot.jsx'));
const AdminLogin = lazy(() => import('./pages/adminLogin.jsx'));
const AdminDashboard = lazy(() => import('./pages/adminDashboard.jsx'));

// Pages
const SessionDetail = lazy(() => import('./pages/SessionDetail.jsx'));
const ProfessorDashboard = lazy(() => import('./pages/professor_dashboard.jsx'));
const ManageCourses = lazy(() => import('./pages/ManageCourses.jsx'));
const Projects = lazy(() => import('./pages/projects.jsx'));
const Forum = lazy(() => import('./pages/forum.jsx'));

const ProfessorProjects = lazy(() => import('./pages/professor_project.jsx'));
const CourseViewer = lazy(() => import('./pages/CourseViewer.jsx'));
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HostedLogin from './pages/HostedLogin.jsx';
import { HOSTED } from './lib/api';

function CoursesRoute() {
  const location = useLocation();
  return <CourseViewer key={location.key} />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div role="status" className="min-h-screen grid place-items-center text-indigo-600 font-bold">Loading CampusConnect…</div>}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={HOSTED ? <HostedLogin /> : <Login />} />
        <Route path="/signup" element={HOSTED ? <HostedLogin /> : <Signup />} />
        <Route path="/forgot" element={HOSTED ? <HostedLogin /> : <Forgot />} />
        <Route path="/admin-login" element={HOSTED ? <HostedLogin admin /> : <AdminLogin />} />
        <Route path="/student-dashboard" element={<Navigate to="/courses" replace />} />

        {/* PROTECTED ROUTES (No Layout Wrapper Here!) */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />

       

        <Route
          path="/professor-dashboard"
          element={
            <ProtectedRoute allowedRoles={["Professor"]}>
              <ProfessorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/courses"
          element={
            <ProtectedRoute allowedRoles={["Student", "Professor"]}>
              <CoursesRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sessions/:sessionId"
          element={
            <ProtectedRoute allowedRoles={["Student", "Professor"]}>
              <SessionDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-courses"
          element={
            <ProtectedRoute allowedRoles={["Professor"]}>
              <ManageCourses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/professor-projects"
          element={
            <ProtectedRoute allowedRoles={["Professor"]}>
              <ProfessorProjects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute allowedRoles={["Student", "Professor"]}>
              <Projects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/forum"
          element={
            <ProtectedRoute allowedRoles={["Student", "Professor"]}>
              <Forum />
            </ProtectedRoute>
          }
        />



        {/* 404 CATCH-ALL */}
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
