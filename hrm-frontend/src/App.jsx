import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Leave from "./pages/Leave";
import Login from "./pages/Login";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeePortal from "./pages/employee/EmployeePortal";
import MyLeaves from "./pages/employee/MyLeaves";
import MyPayrolls from "./pages/employee/MyPayrolls";
import MyAttendance from "./pages/employee/MyAttendance";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>

      {/* LOGIN ROUTE */}
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/" />
          ) : (
            <Login />
          )
        }
      />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={
          token ? (
            <Layout />
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payroll" element={<Payroll />} />
        <Route path="leave" element={<Leave />} />
      </Route>

        {/* EMPLOYEE SELF-SERVICE */}
        <Route
          path="/employee/login"
          element={
            token ? (
              <Navigate to="/employee" />
            ) : (
              <EmployeeLogin />
            )
          }
        />

        <Route
          path="/employee"
          element={
            token ? (
              <EmployeePortal />
            ) : (
              <Navigate to="/employee/login" />
            )
          }
        >
          <Route index element={<MyLeaves />} />
          <Route path="leaves" element={<MyLeaves />} />
          <Route path="payslips" element={<MyPayrolls />} />
          <Route path="attendance" element={<MyAttendance />} />
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
