import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteAdminAccount,
  decodeToken,
  getAdminById,
  getAdminProfile,
  updateAdminAccount,
} from "../services/api";

const PERMISSION_GROUPS = [
  {
    heading: "Leaves",
    options: [
      { key: "leave:view", label: "View" },
      { key: "leave:approve", label: "Accept/ Reject" },
    ],
  },
  {
    heading: "Attendance",
    options: [
      { key: "attendance:view", label: "View" },
      { key: "attendance:mark", label: "Mark" },
    ],
  },
  {
    heading: "Payroll",
    options: [
      { key: "payroll:view", label: "View" },
      { key: "payroll:generate", label: "Generate" },
    ],
  },
  {
    heading: "Employees",
    options: [
      { key: "employee:view", label: "View" },
      { key: "employee:edit", label: "Edit" },
    ],
  },
];

export default function AdminDetails({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const effectiveToken = token ?? localStorage.getItem("token");
  const decoded = decodeToken(effectiveToken);

  const [viewerProfile, setViewerProfile] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("hr");
  const [permissions, setPermissions] = useState([]);

  const allowedSuperadmins = ["client@company.com", "dev@qloax.com"];
  const isAllowedViewer =
    decoded?.role === "superadmin" &&
    allowedSuperadmins.includes(String(viewerProfile?.email || "").toLowerCase());

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [profile, adminData] = await Promise.all([
          getAdminProfile(effectiveToken),
          getAdminById(id, effectiveToken),
        ]);
        setViewerProfile(profile);
        if (adminData?._id) {
          setAdmin(adminData);
          setName(adminData.name || "");
          setEmail(adminData.email || "");
          setRole(adminData.role || "hr");
          setPermissions(Array.isArray(adminData.permissions) ? adminData.permissions : []);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id && effectiveToken) load();
  }, [id, effectiveToken]);

  const saveAdmin = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateAdminAccount(
        id,
        { name: name.trim(), email: email.trim().toLowerCase(), role, permissions },
        effectiveToken
      );
      if (res?._id) {
        setAdmin(res);
        alert("Admin updated");
      } else {
        alert(res?.message || "Could not update admin");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!admin) return;
    const res = await updateAdminAccount(id, { isActive: !admin.isActive }, effectiveToken);
    if (res?._id) setAdmin(res);
    else alert(res?.message || "Could not update account status");
  };

  const deleteAdmin = async () => {
    if (!confirm("Delete this admin account?")) return;
    const res = await deleteAdminAccount(id, effectiveToken);
    if (res?.message) {
      alert("Admin deleted");
      navigate("/");
    } else {
      alert(res?.message || "Could not delete admin");
    }
  };

  if (loading) return <div style={styles.page}>Loading admin details...</div>;
  if (!isAllowedViewer) return <div style={styles.page}>You do not have access to this page.</div>;
  if (!admin) return <div style={styles.page}>Admin not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{admin.name}</h2>
          <p style={styles.subtitle}>{admin.email}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnSecondary} onClick={() => navigate("/")}>Back</button>
          <button style={styles.btnDanger} onClick={deleteAdmin}>Delete</button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Edit Admin</h3>
          <form onSubmit={saveAdmin} style={styles.form}>
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="superadmin">Superadmin</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
            </select>
            <button style={styles.btnPrimary} disabled={saving} type="submit">{saving ? "Saving..." : "Save Changes"}</button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Permissions</h3>
          <div style={styles.permissionGroups}>
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.heading} style={styles.permissionGroup}>
                <div style={styles.permissionGroupTitle}>{group.heading}</div>
                <div style={styles.permissionsGrid}>
                  {group.options.map((opt) => (
                    <label key={opt.key} style={styles.permissionItem}>
                      <input
                        type="checkbox"
                        checked={permissions.includes(opt.key)}
                        onChange={(e) => {
                          setPermissions((prev) =>
                            e.target.checked ? Array.from(new Set([...prev, opt.key])) : prev.filter((p) => p !== opt.key)
                          );
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Account Actions</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={styles.btnPrimary} onClick={toggleActive}>
            {admin.isActive ? "Deactivate" : "Activate"}
          </button>
          <button style={styles.btnDanger} onClick={deleteAdmin}>Delete Admin</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "#e1d7ee", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: "6px 0 0 0", color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: "#f4eefb", border: "1px solid #ececec", borderRadius: 12, padding: 14 },
  cardTitle: { marginTop: 0, marginBottom: 10, fontSize: 16 },
  form: { display: "grid", gap: 10 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d4d4d4" },
  permissionGroups: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  permissionGroup: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, background: "#fff" },
  permissionGroupTitle: { fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 6 },
  permissionsGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },
  permissionItem: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" },
  btnPrimary: { padding: "10px 14px", borderRadius: 8, border: "1px solid #d9c8f6", background: "#f3ecff", color: "#3f2a5f", cursor: "pointer" },
  btnSecondary: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
  btnDanger: { padding: "8px 12px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer" },
};

