import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, role, payload } = useAuth();
  const effectiveRole = role || payload?.role || null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/attendance", label: "Attendance" },
    { to: "/work-hours", label: "Work Hours" },
    { to: "/payroll", label: "Payroll" },
    ...((effectiveRole === "superadmin" || effectiveRole === "hr")
      ? [{ to: "/salary-management", label: "Salary Mgmt" }]
      : []),
    { to: "/leave", label: "Leave" },
    ...(effectiveRole === "superadmin" ? [{ to: "/org-setup", label: "Org Setup" }] : []),
  ];

  return (
    <div style={styles.topbar}>
      <div style={styles.leftGroup}>
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              style={{
                ...styles.navButton,
                ...(active ? styles.navButtonActive : {}),
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={styles.rightGroup}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {role && (
            <div style={{ fontSize: 13, color: "#4c3569", padding: "6px 8px", background: "#f3f4f6", borderRadius: 8 }}>
              {role.toUpperCase()}
            </div>
          )}
          <button style={styles.profileButton} title="Profile">
            {payload?.name ? payload.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : "JD"}
          </button>
          <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  topbar: {
    height: 52,
    backgroundColor: "#33204d",
    borderBottom: "1px solid #2a183f",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    gap: 12,
  },
  leftGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  rightGroup: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  navButton: {
    backgroundColor: "#f3ecff",
    border: "1px solid #d9c8f6",
    padding: "8px 12px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#3f2a5f",
    fontWeight: 600,
  },
  navButtonActive: {
    backgroundColor: "#e4d5fb",
    color: "#2f1f48",
  },
  logoutButton: {
    backgroundColor: "#f3ecff",
    color: "#3f2a5f",
    padding: "6px 10px",
    border: "1px solid #d9c8f6",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  profileButton: {
    backgroundColor: "#f3ecff",
    border: "none",
    padding: "6px 10px",
    borderRadius: 999,
    cursor: "pointer",
    minWidth: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#3f2a5f",
  },
};
