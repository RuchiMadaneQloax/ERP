import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeePortal() {
  const { payload } = useAuth();

  return (
    <div style={{padding:20}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h2>Employee Portal</h2>
        <div>{payload?.name || payload?.id}</div>
      </header>

      <nav style={{marginBottom:12}}>
        <Link to="/employee/leaves" style={{marginRight:12}}>My Leaves</Link>
        <Link to="/employee/payslips" style={{marginRight:12}}>Payslips</Link>
        <Link to="/employee/attendance">Attendance</Link>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
