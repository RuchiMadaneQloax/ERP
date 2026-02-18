import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Login from "./pages/Login";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token")
  );

  return (
    <Routes>

      {/* LOGIN ROUTE */}
      <Route
        path="/login"
        element={
          token ? (
            <Navigate to="/" />
          ) : (
            <Login setToken={setToken} />
          )
        }
      />

      {/* PROTECTED ROUTES */}
      <Route
        path="/"
        element={
          token ? (
            <Layout setToken={setToken} />
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="payroll" element={<Payroll />} />
      </Route>

    </Routes>
  );
}

export default App;
