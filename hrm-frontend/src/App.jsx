import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Leave from "./pages/Leave";
import Login from "./pages/Login";
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
