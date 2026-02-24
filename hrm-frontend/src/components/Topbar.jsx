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
    { to: "/payroll", label: "Payroll" },
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
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {role && <div style={{fontSize:13,color:'#374151',padding:'6px 8px',background:'#f3f4f6',borderRadius:8}}>{role.toUpperCase()}</div>}
          <button style={styles.iconButton} title="Notifications">🔔</button>
          <button style={styles.profileButton} title="Profile">{payload?.name ? payload.name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() : 'JD'}</button>
          <button style={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
      </div>

    </div>
  );
}

/* ===== STYLE OBJECT ===== */

const styles = {
  topbar: {
    height: "64px",
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
  },

  title: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
  },
  topbar: {
    height: 52,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e6e6e6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    gap: 12,
  },

  leftGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },

  rightGroup: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },

  navButton: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    color: '#374151',
    fontWeight: 600,
  },

  navButtonActive: {
    backgroundColor: '#E6F1EA',
    color: '#24492f'
  },

  logoutButton: {
    backgroundColor: "#355E3B",
    color: "#ffffff",
    padding: "6px 10px",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  iconButton: {
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer'
  },

  profileButton: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    padding: '6px 10px',
    borderRadius: 999,
    cursor: 'pointer',
    minWidth: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#24492f'
  },
};
