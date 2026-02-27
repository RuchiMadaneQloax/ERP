import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Leave from "./pages/Leave";
import OrgSetup from "./pages/OrgSetup";
import EmployeeDetails from "./pages/EmployeeDetails";
import AdminDetails from "./pages/AdminDetails";
import Login from "./pages/Login";
import EmployeePortal from "./pages/employee/EmployeePortal";
import MyRecords from "./pages/employee/MyRecords";
import MyLeaves from "./pages/employee/MyLeaves";
import MyPayrolls from "./pages/employee/MyPayrolls";
import MyAttendance from "./pages/employee/MyAttendance";
import MyWorkHours from "./pages/employee/MyWorkHours";
import ChangePassword from "./pages/employee/ChangePassword";
import EmployeeProfile from "./pages/employee/EmployeeProfile";
import FeedbackAssistant from "./pages/employee/FeedbackAssistant";
import WorkHours from "./pages/WorkHours";
import SalaryManagement from "./pages/SalaryManagement";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { decodeToken } from "./services/api";
import FaceAttendance from "./pages/FaceAttendance";

function AppRoutes() {
  const { token, role } = useAuth();
  const effectiveRole = role || decodeToken(token)?.role || null;

  return (
    <Routes>

      {/* LOGIN ROUTE */}
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to={effectiveRole === "employee" ? "/employee" : "/"} />
          ) : (
            <Login />
          )
        }
      />

      {/* PUBLIC KIOSK FACE ATTENDANCE URL (PHONE/TABLET) */}
      <Route path="/kiosk-face" element={<FaceAttendance />} />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={
          token && effectiveRole !== "employee" ? (
            <Layout />
          ) : token ? (
            <Navigate to="/employee" />
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="work-hours" element={<WorkHours />} />
        <Route path="salary-management" element={<SalaryManagement />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="leave" element={<Leave />} />
        <Route path="org-setup" element={effectiveRole === "superadmin" ? <OrgSetup /> : <Navigate to="/" replace />} />
        <Route path="employees/:id" element={<EmployeeDetails />} />
        <Route path="admins/:id" element={<AdminDetails />} />
      </Route>

        {/* EMPLOYEE SELF-SERVICE */}
        <Route
          path="/employee/login"
          element={
            token ? (
              <Navigate to={effectiveRole === "employee" ? "/employee" : "/"} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/employee"
          element={
            token && effectiveRole === "employee" ? (
              <EmployeePortal />
            ) : token ? (
              <Navigate to="/" />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<MyRecords />} />
          <Route path="records" element={<MyRecords />} />
          <Route path="profile" element={<EmployeeProfile />} />
          <Route path="leaves" element={<MyLeaves />} />
          <Route path="payslips" element={<MyPayrolls />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="work-hours" element={<MyWorkHours />} />
          <Route path="feedback" element={<FeedbackAssistant />} />
          <Route path="password" element={<ChangePassword />} />
        </Route>

    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
