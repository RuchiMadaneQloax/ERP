import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeToken, getAdminProfile, getLeaveRequests, updateLeaveStatus } from "../services/api";
import formatDate from "../utils/formatDate";

function Leave({ token }) {
  const navigate = useNavigate();
  const effectiveToken = token ?? localStorage.getItem("token");

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [canApproveLeaves, setCanApproveLeaves] = useState(false);
  const [loading, setLoading] = useState(false);

  const toDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

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
    const loadAccess = async () => {
      try {
        const payload = decodeToken(effectiveToken);
        const role = payload?.role || null;

        if (role === "hr") {
          setCanApproveLeaves(true);
          return;
        }

        if (role === "superadmin") {
          const profile = await getAdminProfile(effectiveToken);
          const email = String(profile?.email || "").toLowerCase();
          setCanApproveLeaves(["client@company.com", "dev@qloax.com"].includes(email));
          return;
        }

        setCanApproveLeaves(false);
      } catch {
        setCanApproveLeaves(false);
      }
    };

    loadAccess();
  }, [effectiveToken]);

  const handleUpdateStatus = async (id, status) => {
    if (!canApproveLeaves) return;
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

  const pendingCount = leaveRequests.filter((l) => l.status === "pending").length;
  const approvedCount = leaveRequests.filter((l) => l.status === "approved").length;
  const rejectedCount = leaveRequests.filter((l) => l.status === "rejected").length;

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Leave Management</h2>
          <p style={styles.pageSubtitle}>
            Employees apply leave in Employee Portal. HR and authorized superadmins can approve/reject.
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
          {canApproveLeaves ? (
            <p style={styles.noteText}>
              You can review all leave requests and update status.
            </p>
          ) : (
            <p style={styles.noteText}>
              You can only view leave request data.
            </p>
          )}
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Pending</div>
              <div style={styles.metricValue}>{pendingCount}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Approved</div>
              <div style={styles.metricValue}>{approvedCount}</div>
            </div>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Rejected</div>
              <div style={styles.metricValue}>{rejectedCount}</div>
            </div>
          </div>
        </div>

        <div style={{ ...styles.card, ...styles.scrollCard }}>
          <h3 style={styles.sectionTitle}>Leave Requests</h3>

          {leaveRequests.length > 0 ? (
            <div style={styles.horizontalScroll}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>Days</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                    <th style={styles.th}>Logs</th>
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
                      <td style={styles.tdReason}>{req.reason || "-"}</td>
                      <td style={styles.td}>{req.totalDays}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusPill,
                            ...(req.status === "approved" ? styles.statusApproved : {}),
                            ...(req.status === "rejected" ? styles.statusRejected : {}),
                            ...(req.status === "pending" ? styles.statusPending : {}),
                          }}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {canApproveLeaves && req.status === "pending" ? (
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
                          <span style={{ color: "#6b7280" }}>Finalized</span>
                        )}
                      </td>
                      <td style={styles.tdLog}>
                        <div><strong>Applied:</strong> {toDateTime(req.createdAt)}</div>
                        <div><strong>Reviewed:</strong> {toDateTime(req.reviewedAt)}</div>
                        <div>
                          <strong>By:</strong>{" "}
                          {req.reviewedBy
                            ? `${req.reviewedBy?.name || "-"}${req.reviewedBy?.email ? ` (${req.reviewedBy.email})` : ""}`
                            : "-"}
                        </div>
                      </td>
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
    backgroundColor: "#e1d7ee",
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
  card: { background: "#f4eefb", padding: 16, borderRadius: 12, border: "1px solid #eee" },
  scrollCard: { overflowX: "auto" },
  horizontalScroll: { overflowX: "auto", width: "100%" },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginBottom: 12 },
  noteText: { color: "#6b7280", margin: 0 },
  metricsGrid: { marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 8 },
  metricCard: { background: "#fff", border: "1px solid #e4d8f4", borderRadius: 10, padding: 10 },
  metricLabel: { fontSize: 12, color: "#6b7280" },
  metricValue: { fontSize: 20, fontWeight: 700, color: "#3f2a5f" },
  table: { width: "100%", minWidth: 1120, borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 8, borderBottom: "1px solid #eee", color: "#6b7280" },
  td: { padding: 8, borderBottom: "1px solid #f3f3f3" },
  tdReason: { padding: 8, borderBottom: "1px solid #f3f3f3", minWidth: 180, color: "#374151" },
  tdLog: { padding: 8, borderBottom: "1px solid #f3f3f3", minWidth: 250, color: "#374151", fontSize: 12, lineHeight: 1.5 },
  statusPill: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    border: "1px solid transparent",
  },
  statusPending: { background: "#fff7ed", color: "#9a3412", borderColor: "#fed7aa" },
  statusApproved: { background: "#ecfdf3", color: "#166534", borderColor: "#bbf7d0" },
  statusRejected: { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" },
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

