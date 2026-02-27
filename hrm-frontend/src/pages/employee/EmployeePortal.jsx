import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function EmployeePortal() {
  const { payload, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (payload?.name || payload?.id || 'E')
    .toString()
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Employee Dashboard</h2>
          <p style={styles.subtitle}>Track your leaves, attendance and payslips</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.profileChip}>
            <div style={styles.avatar}>{initials}</div>
            <button
              type="button"
              title="Profile"
              onClick={() => navigate("/employee/profile")}
              style={styles.profileNameButton}
            >
              {payload?.name || payload?.id}
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </button>
        </div>
      </header>

      <nav style={styles.navRow}>
        <NavLink to="/employee/records" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          All Records
        </NavLink>
        <NavLink to="/employee/leaves" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          My Leaves
        </NavLink>
        <NavLink to="/employee/payslips" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          Payslips
        </NavLink>
        <NavLink to="/employee/attendance" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          Attendance
        </NavLink>
        <NavLink to="/employee/work-hours" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          Work Hours
        </NavLink>
        <NavLink to="/employee/feedback" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          AI Feedback
        </NavLink>
        <NavLink to="/employee/password" style={({ isActive }) => ({ ...styles.navButton, ...(isActive ? styles.navButtonActive : {}) })}>
          Change Password
        </NavLink>
      </nav>

      <main style={styles.contentCard}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  page: {
    backgroundColor: '#e1d7ee',
    minHeight: '100vh',
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    color: '#452c63',
  },
  subtitle: {
    margin: '6px 0 0 0',
    color: '#6e5a86',
    fontSize: 14,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  profileChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#f7f2fc',
    border: '1px solid #dccdf0',
    borderRadius: 999,
    padding: '8px 12px 8px 8px',
    color: '#4c3569',
    fontWeight: 600,
  },
  profileNameButton: {
    border: "none",
    background: "transparent",
    color: "#4c3569",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
    fontSize: 14,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: '#6f4a99',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  logoutButton: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #d6c4ec',
    background: '#fff',
    color: '#5a3d7f',
    cursor: 'pointer',
    fontWeight: 700,
  },
  navRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  navButton: {
    textDecoration: 'none',
    padding: '9px 14px',
    borderRadius: 10,
    border: '1px solid #dbc9f1',
    background: '#f9f5ff',
    color: '#5d4480',
    fontWeight: 600,
  },
  navButtonActive: {
    background: '#6f4a99',
    borderColor: '#6f4a99',
    color: '#fff',
  },
  contentCard: {
    background: '#f4eefb',
    border: '1px solid #decff1',
    borderRadius: 14,
    boxShadow: '0 8px 24px rgba(81, 55, 112, 0.08)',
    padding: 18,
  },
};
