import { useEffect, useMemo, useState } from "react";
import { getAttendance, getEmployees } from "../services/api";

function toIstDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function WorkHours({ token }) {
  const effectiveToken = token ?? localStorage.getItem("token");
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const res = await getEmployees(effectiveToken);
      setEmployees(Array.isArray(res?.employees) ? res.employees : []);
    };
    if (effectiveToken) loadEmployees();
  }, [effectiveToken]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getAttendance(effectiveToken, month);
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    if (effectiveToken) load();
  }, [effectiveToken, month]);

  const filtered = useMemo(() => {
    const onlyWorkRows = rows.filter((r) => r?.checkInTime || r?.checkOutTime);
    if (!selectedEmployee) return onlyWorkRows;
    return onlyWorkRows.filter((r) => String(r?.employee?._id || r?.employee) === String(selectedEmployee));
  }, [rows, selectedEmployee]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>Work Hours</h2>
          <p style={{ margin: "4px 0 0 0", color: "#6b7280" }}>Check-in/check-out and total hours</p>
        </div>
        <div style={styles.filters}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={styles.input} />
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={styles.input}>
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <div style={styles.note}>Loading...</div> : null}
      {filtered.length === 0 ? (
        <div style={styles.note}>No work-hour records found.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Check-In</th>
                <th style={styles.th}>Check-Out</th>
                <th style={styles.th}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td style={styles.td}>{r?.employee?.name || "-"}</td>
                  <td style={styles.td}>{toIstDateTime(r.date).split(",")[0]}</td>
                  <td style={styles.td}>{toIstDateTime(r.checkInTime)}</td>
                  <td style={styles.td}>{toIstDateTime(r.checkOutTime)}</td>
                  <td style={styles.td}>{typeof r?.workingHours === "number" ? r.workingHours.toFixed(2) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { background: "#e1d7ee", minHeight: "100vh", padding: 24, display: "flex", flexDirection: "column", gap: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  filters: { display: "flex", gap: 8, flexWrap: "wrap" },
  input: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff" },
  note: { padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden" },
  th: { textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: 12 },
  td: { padding: 10, borderBottom: "1px solid #f3f4f6", color: "#374151", fontSize: 13 },
};

