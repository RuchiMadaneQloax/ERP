import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Dashboard token={token} setToken={setToken} />}
      />
      <Route
        path="/attendance"
        element={<Attendance token={token} />}
      />
      <Route path="*" element={<Navigate to="/" />} />
      <Route
  path="/payroll"
  element={<Payroll token={token} />}
/>
    </Routes>
  );
}

export default App;
