import React, { useEffect, useState } from 'react';
import formatDate from '../../utils/formatDate';
import { applyMyLeave, getLeaveTypes, getMyLeaves } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MyLeaves() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadLeaves = async () => {
    const data = await getMyLeaves(effectiveToken);
    setLeaves(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const load = async () => {
      const [leaveData, leaveTypeData] = await Promise.all([
        getMyLeaves(effectiveToken),
        getLeaveTypes(effectiveToken),
      ]);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      setLeaveTypes(Array.isArray(leaveTypeData) ? leaveTypeData : []);
    };
    if (effectiveToken) load();
  }, [effectiveToken]);

  const submitLeave = async (e) => {
    e.preventDefault();
    if (!selectedLeaveType || !startDate || !endDate) {
      setMessage('Please fill all required fields.');
      return;
    }

    const s = new Date(startDate);
    const en = new Date(endDate);
    if (s > en) {
      setMessage('Start date cannot be after end date.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      const res = await applyMyLeave(
        { leaveType: selectedLeaveType, startDate, endDate, reason },
        effectiveToken
      );

      if (res && res._id) {
        setMessage('Leave request submitted.');
        setSelectedLeaveType('');
        setStartDate('');
        setEndDate('');
        setReason('');
        await loadLeaves();
      } else {
        setMessage(res?.message || 'Could not submit leave request.');
      }
    } catch {
      setMessage('Error submitting leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = (status) => {
    const value = (status || '').toLowerCase();
    if (value === 'approved') return styles.badgeApproved;
    if (value === 'rejected') return styles.badgeRejected;
    return styles.badgePending;
  };

  return (
    <div style={styles.section}>
      <h3 style={styles.title}>My Leaves</h3>
      <div style={styles.formCard}>
        <h4 style={styles.formTitle}>Apply For Leave</h4>
        <form onSubmit={submitLeave} style={styles.formGrid}>
          <div style={styles.field}>
            <label style={styles.label}>Leave Type</label>
            <select value={selectedLeaveType} onChange={(e) => setSelectedLeaveType(e.target.value)} style={styles.input}>
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt._id}>
                  {lt.name} ({lt.maxDaysPerYear} days/yr)
                </option>
              ))}
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
          </div>
          <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <label style={styles.label}>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...styles.input, minHeight: 80 }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="submit" disabled={submitting} style={styles.submitButton}>
              {submitting ? 'Submitting...' : 'Apply Leave'}
            </button>
            {message ? <span style={styles.message}>{message}</span> : null}
          </div>
        </form>
      </div>

      {leaves.length === 0 ? (
        <div style={styles.empty}>No leave records found.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>From</th>
              <th style={styles.th}>To</th>
              <th style={styles.th}>Days</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map(l=> (
              <tr key={l._id} style={styles.tr}>
                <td style={styles.td}>{l.leaveType?.name}</td>
                <td style={styles.td}>{formatDate(l.startDate)}</td>
                <td style={styles.td}>{formatDate(l.endDate)}</td>
                <td style={styles.td}>{l.totalDays}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.badgeBase, ...statusStyle(l.status) }}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  title: { margin: 0, color: '#4b316c', fontSize: 20 },
  formCard: { background: '#fff', border: '1px solid #e5d9f4', borderRadius: 12, padding: 12 },
  formTitle: { margin: 0, marginBottom: 10, color: '#57397b', fontSize: 15 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, color: '#6e5a86', fontWeight: 700 },
  input: { padding: '9px 10px', borderRadius: 8, border: '1px solid #e2d7f2', background: '#fcf9ff', color: '#3f2d57' },
  submitButton: { padding: '9px 12px', borderRadius: 8, border: 'none', background: '#6f4a99', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  message: { fontSize: 13, color: '#5d4480' },
  empty: { padding: 12, background: '#f7f2fc', border: '1px solid #dfd0f2', borderRadius: 10, color: '#6a5880' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: 0, overflow: 'hidden' },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#6e5a86',
    borderBottom: '1px solid #e5d9f4',
    background: '#f4ecfc',
  },
  tr: { background: '#fff' },
  td: { padding: '12px 10px', borderBottom: '1px solid #efe7fa', color: '#3f2d57' },
  badgeBase: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'capitalize',
  },
  badgeApproved: { background: '#e7dcf8', color: '#4d2f75' },
  badgeRejected: { background: '#f6dcec', color: '#7a2650' },
  badgePending: { background: '#efe4fb', color: '#5f3f83' },
};
