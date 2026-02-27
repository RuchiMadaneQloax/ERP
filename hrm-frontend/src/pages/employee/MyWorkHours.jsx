import { useEffect, useMemo, useState } from "react";
import { getMyAttendance } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

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

export default function MyWorkHours() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem("token");
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMyAttendance(effectiveToken, month);
        setRows(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    };
    if (effectiveToken) load();
  }, [effectiveToken, month]);

  const workRows = useMemo(
    () => rows.filter((r) => r?.checkInTime || r?.checkOutTime),
    [rows]
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h3 style={{ margin: 0 }}>My Work Hours</h3>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={styles.monthInput} />
      </div>
      {loading ? <div style={styles.note}>Loading...</div> : null}
      {workRows.length === 0 ? (
        <div style={styles.note}>No work-hour records for selected month.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Check-In</th>
                <th style={styles.th}>Check-Out</th>
                <th style={styles.th}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {workRows.map((r) => (
                <tr key={r._id}>
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
  page: { display: "flex", flexDirection: "column", gap: 10 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  monthInput: { border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 8px", background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb", color: "#6b7280", fontSize: 12 },
  td: { padding: 8, borderBottom: "1px solid #f3f4f6", fontSize: 13, color: "#374151" },
  note: { padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" },
};
