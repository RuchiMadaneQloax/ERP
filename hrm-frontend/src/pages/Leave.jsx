import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeToken, getLeaveRequests, updateLeaveStatus } from "../services/api";
import formatDate from "../utils/formatDate";

function Leave({ token }) {
  const navigate = useNavigate();
  const effectiveToken = token ?? localStorage.getItem("token");

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLeaveRequests = async () => {
      try {
        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
        else setLeaveRequests([]);
      } catch (err) {
        console.error("Error loading leave data", err);
        setLeaveRequests([]);
      }
    };

    if (effectiveToken) loadLeaveRequests();
  }, [effectiveToken]);

  useEffect(() => {
    if (!effectiveToken) return;
    try {
      const payload = decodeToken(effectiveToken);
      setUserRole(payload?.role || null);
    } catch {
      setUserRole(null);
    }
  }, [effectiveToken]);

  const handleUpdateStatus = async (id, status) => {
    if (userRole !== "hr") return;
    if (!confirm(`Mark this request as ${status}?`)) return;

    try {
      setLoading(true);
      const res = await updateLeaveStatus(id, status, effectiveToken);
      if (res && res._id) {
        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
        else setLeaveRequests([]);
      } else {
        alert(res?.message || "Could not update status");
      }
    } catch (err) {
      console.error("Update status error", err);
      alert("Error updating status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Leave Management</h2>
          <p style={styles.pageSubtitle}>
            Employees apply leave in Employee Portal. HR can approve/reject. Superadmin is read-only.
          </p>
        </div>
        <div>
          <button style={styles.backButton} onClick={() => navigate("/")}>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Access Policy</h3>
          {userRole === "hr" ? (
            <p style={styles.noteText}>
              You can review all leave requests and update status.
            </p>
          ) : (
            <p style={styles.noteText}>
              You can only view leave request data.
            </p>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Leave Requests</h3>

          {leaveRequests.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Days</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                    <th style={styles.th}>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((req) => (
                    <tr key={req._id}>
                      <td style={styles.td}>{req.employee?.name}</td>
                      <td style={styles.td}>{req.leaveType?.name}</td>
                      <td style={styles.td}>
                        {formatDate(req.startDate)} - {formatDate(req.endDate)}
                      </td>
                      <td style={styles.td}>{req.totalDays}</td>
                      <td style={styles.td}>{req.status}</td>
                      <td style={styles.td}>
                        {userRole === "hr" ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              disabled={loading}
                              style={styles.approveButton}
                              onClick={() => handleUpdateStatus(req._id, "approved")}
                            >
                              Approve
                            </button>
                            <button
                              disabled={loading}
                              style={styles.rejectButton}
                              onClick={() => handleUpdateStatus(req._id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#6b7280" }}>-</span>
                        )}
                      </td>
                      <td style={styles.td}>{formatDate(req.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#6b7280" }}>No leave requests found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leave;

const styles = {
  container: {
    backgroundColor: "#EDE9E3",
    minHeight: "100vh",
    padding: 28,
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  pageTitle: { fontSize: 24, fontWeight: 700, margin: 0 },
  pageSubtitle: { color: "#6b7280", marginTop: 6 },
  backButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "none",
    background: "#fff",
    cursor: "pointer",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  grid: { display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 },
  card: { background: "#F7F6F3", padding: 16, borderRadius: 12, border: "1px solid #eee" },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12 },
  noteText: { color: "#6b7280", margin: 0 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 8, borderBottom: "1px solid #eee", color: "#6b7280" },
  td: { padding: 8, borderBottom: "1px solid #f3f3f3" },
  approveButton: {
    padding: "6px 8px",
    borderRadius: 8,
    border: "none",
    background: "#10b981",
    color: "#fff",
    cursor: "pointer",
  },
  rejectButton: {
    padding: "6px 8px",
    borderRadius: 8,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
  },
};
