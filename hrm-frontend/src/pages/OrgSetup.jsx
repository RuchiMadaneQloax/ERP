import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createDepartment,
  createDesignation,
  getDepartments,
  getDesignations,
  updateDepartment,
  updateDesignation,
} from "../services/api";

export default function OrgSetup() {
  const { token, role } = useAuth();
  const effectiveToken = token ?? localStorage.getItem("token");
  const effectiveRole = role || decodeRoleFromToken(effectiveToken);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptDescription, setDeptDescription] = useState("");

  const [desigTitle, setDesigTitle] = useState("");
  const [desigDepartment, setDesigDepartment] = useState("");
  const [desigBaseSalary, setDesigBaseSalary] = useState("");
  const [desigLevel, setDesigLevel] = useState(1);

  const loadData = async () => {
    const [deptRes, desigRes] = await Promise.all([
      getDepartments(effectiveToken),
      getDesignations(effectiveToken),
    ]);
    setDepartments(Array.isArray(deptRes?.departments) ? deptRes.departments : []);
    setDesignations(Array.isArray(desigRes?.designations) ? desigRes.designations : []);
  };

  useEffect(() => {
    if (effectiveToken) loadData();
  }, [effectiveToken]);

  const submitDepartment = async (e) => {
    e.preventDefault();
    if (!deptName || !deptCode) {
      alert("Department name and code are required");
      return;
    }
    try {
      setLoading(true);
      const res = await createDepartment(
        { name: deptName.trim(), code: deptCode.trim().toUpperCase(), description: deptDescription.trim() },
        effectiveToken
      );
      if (res?._id) {
        setDeptName("");
        setDeptCode("");
        setDeptDescription("");
        await loadData();
      } else {
        alert(res?.message || "Could not create department");
      }
    } finally {
      setLoading(false);
    }
  };

  const submitDesignation = async (e) => {
    e.preventDefault();
    if (!desigTitle || !desigDepartment || !desigBaseSalary || !desigLevel) {
      alert("All designation fields are required");
      return;
    }
    try {
      setLoading(true);
      const res = await createDesignation(
        {
          title: desigTitle.trim(),
          department: desigDepartment,
          baseSalary: Number(desigBaseSalary),
          level: Number(desigLevel),
        },
        effectiveToken
      );
      if (res?._id) {
        setDesigTitle("");
        setDesigDepartment("");
        setDesigBaseSalary("");
        setDesigLevel(1);
        await loadData();
      } else {
        alert(res?.message || "Could not create designation");
      }
    } finally {
      setLoading(false);
    }
  };

  const editDepartment = async (dept) => {
    const name = prompt("Department name", dept.name || "");
    if (name === null) return;
    const code = prompt("Department code", dept.code || "");
    if (code === null) return;
    const description = prompt("Department description", dept.description || "");
    if (description === null) return;

    if (!String(name).trim() || !String(code).trim()) {
      alert("Department name and code are required");
      return;
    }

    try {
      setLoading(true);
      const res = await updateDepartment(
        dept._id,
        {
          name: String(name).trim(),
          code: String(code).trim().toUpperCase(),
          description: String(description).trim(),
        },
        effectiveToken
      );
      if (res?._id) {
        await loadData();
      } else {
        alert(res?.message || "Could not update department");
      }
    } finally {
      setLoading(false);
    }
  };

  const editDesignation = async (desig) => {
    const title = prompt("Designation title", desig.title || "");
    if (title === null) return;
    const department = prompt("Department ID", desig.department?._id || "");
    if (department === null) return;
    const baseSalary = prompt("Base salary", String(desig.baseSalary ?? ""));
    if (baseSalary === null) return;
    const level = prompt("Level (1-10)", String(desig.level ?? 1));
    if (level === null) return;

    if (!String(title).trim() || !String(department).trim() || !String(baseSalary).trim() || !String(level).trim()) {
      alert("All designation fields are required");
      return;
    }

    try {
      setLoading(true);
      const res = await updateDesignation(
        desig._id,
        {
          title: String(title).trim(),
          department: String(department).trim(),
          baseSalary: Number(baseSalary),
          level: Number(level),
        },
        effectiveToken
      );
      if (res?._id) {
        await loadData();
      } else {
        alert(res?.message || "Could not update designation");
      }
    } finally {
      setLoading(false);
    }
  };

  if (effectiveRole !== "superadmin") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>Only superadmins can access this screen.</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>Organization Setup</h2>
      <p style={styles.subtitle}>Create and edit departments and designations.</p>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Create Department</h3>
          <form onSubmit={submitDepartment} style={styles.form}>
            <input style={styles.input} placeholder="Department Name" value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            <input style={styles.input} placeholder="Department Code" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
            <textarea
              style={{ ...styles.input, minHeight: 80 }}
              placeholder="Description (optional)"
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
            />
            <button style={styles.primaryButton} disabled={loading} type="submit">
              {loading ? "Saving..." : "Create Department"}
            </button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Create Designation</h3>
          <form onSubmit={submitDesignation} style={styles.form}>
            <input style={styles.input} placeholder="Designation Title" value={desigTitle} onChange={(e) => setDesigTitle(e.target.value)} />
            <select style={styles.input} value={desigDepartment} onChange={(e) => setDesigDepartment(e.target.value)}>
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
            <input style={styles.input} type="number" placeholder="Base Salary" value={desigBaseSalary} onChange={(e) => setDesigBaseSalary(e.target.value)} />
            <input style={styles.input} type="number" min={1} max={10} placeholder="Level (1-10)" value={desigLevel} onChange={(e) => setDesigLevel(e.target.value)} />
            <button style={styles.primaryButton} disabled={loading} type="submit">
              {loading ? "Saving..." : "Create Designation"}
            </button>
          </form>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Departments</h3>
          <div style={styles.list}>
            {departments.map((d) => (
              <div key={d._id} style={styles.row}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{d.code}</div>
                </div>
                <button style={styles.secondaryButton} type="button" disabled={loading} onClick={() => editDepartment(d)}>
                  Edit
                </button>
              </div>
            ))}
            {departments.length === 0 && <div style={styles.empty}>No departments yet.</div>}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Designations</h3>
          <div style={styles.list}>
            {designations.map((d) => (
              <div key={d._id} style={styles.row}>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {d.department?.name} - Base: {d.baseSalary} - Level: {d.level}
                  </div>
                </div>
                <button style={styles.secondaryButton} type="button" disabled={loading} onClick={() => editDesignation(d)}>
                  Edit
                </button>
              </div>
            ))}
            {designations.length === 0 && <div style={styles.empty}>No designations yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: "#e1d7ee",
    minHeight: "100vh",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: 0, color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: {
    background: "#f4eefb",
    border: "1px solid #ececec",
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: { marginTop: 0, marginBottom: 10, fontSize: 16 },
  form: { display: "grid", gap: 10 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d4d4d4" },
  primaryButton: { padding: "10px 14px", borderRadius: 8, border: "1px solid #d9c8f6", background: "#f3ecff", color: "#3f2a5f", cursor: "pointer" },
  secondaryButton: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#111827", cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  row: { background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  empty: { color: "#6b7280", fontSize: 13 },
};

function decodeRoleFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role || null;
  } catch {
    return null;
  }
}

