import React, { useEffect, useState } from 'react';
import { getMyAttendance, getMyLeaves, getMyPayrolls } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import formatDate from '../../utils/formatDate';
import formatCurrency from '../../utils/formatCurrency';

export default function MyRecords() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [leaveData, payrollData, attendanceData] = await Promise.all([
          getMyLeaves(effectiveToken),
          getMyPayrolls(effectiveToken),
          getMyAttendance(effectiveToken),
        ]);

        const messages = [leaveData, payrollData, attendanceData]
          .map((d) => (d && !Array.isArray(d) ? d.message : ''))
          .filter(Boolean);
        if (messages.length > 0) {
          setError(messages[0]);
        }

        setLeaves(Array.isArray(leaveData) ? leaveData : []);
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);
        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
      } catch {
        setError('Failed to load your records. Please login again.');
      } finally {
        setLoading(false);
      }
    };

    if (effectiveToken) load();
  }, [effectiveToken]);

  return (
    <div style={styles.page}>
      <h3 style={styles.title}>My Records</h3>
      {loading ? (
        <div style={styles.loading}>Loading your records...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <div style={styles.grid}>
          <section style={styles.card}>
            <h4 style={styles.cardTitle}>Leaves ({leaves.length})</h4>
            {leaves.length === 0 ? (
              <div style={styles.empty}>No leave records found.</div>
            ) : (
              <div style={styles.list}>
                {leaves.slice(0, 8).map((l) => (
                  <div key={l._id} style={styles.row}>
                    <div style={styles.rowMain}>{l.leaveType?.name || 'Leave'}</div>
                    <div style={styles.rowMeta}>{formatDate(l.startDate)} to {formatDate(l.endDate)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h4 style={styles.cardTitle}>Payrolls ({payrolls.length})</h4>
            {payrolls.length === 0 ? (
              <div style={styles.empty}>No payroll records found.</div>
            ) : (
              <div style={styles.list}>
                {payrolls.slice(0, 8).map((p) => (
                  <div key={p._id} style={styles.row}>
                    <div style={styles.rowMain}>{formatDate(p.month)}</div>
                    <div style={styles.rowMeta}>Final: {formatCurrency(p.finalSalary)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.card}>
            <h4 style={styles.cardTitle}>Attendance Records ({attendance.length})</h4>
            {attendance.length === 0 ? (
              <div style={styles.empty}>No attendance records found.</div>
            ) : (
              <div style={styles.list}>
                {attendance.slice(0, 8).map((a) => (
                  <div key={a._id} style={styles.row}>
                    <div style={styles.rowMain}>{formatDate(a.date)}</div>
                    <div style={styles.rowMeta}>{a.status} {a.overtimeHours ? `- OT ${a.overtimeHours}h` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 12 },
  title: { margin: 0, color: '#4b316c', fontSize: 20 },
  loading: { padding: 12, background: '#f7f2fc', border: '1px solid #dfd0f2', borderRadius: 10, color: '#6a5880' },
  error: { padding: 12, background: '#fae7f1', border: '1px solid #efcfe0', borderRadius: 10, color: '#7a2650' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5d9f4', borderRadius: 12, padding: 12 },
  cardTitle: { margin: 0, marginBottom: 10, color: '#57397b', fontSize: 15 },
  empty: { padding: 10, background: '#f9f5ff', border: '1px solid #eadffd', borderRadius: 8, color: '#6a5880', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { background: '#fcf9ff', border: '1px solid #f0e7fb', borderRadius: 8, padding: '8px 10px' },
  rowMain: { fontWeight: 700, color: '#4d316f', fontSize: 14 },
  rowMeta: { fontSize: 12, color: '#6f5b88', marginTop: 3 },
};
