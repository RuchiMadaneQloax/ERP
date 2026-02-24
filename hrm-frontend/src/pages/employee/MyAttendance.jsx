import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyAttendance, getMyLeaves } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function MyAttendance() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [rows, setRows] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showMarkedMessage, setShowMarkedMessage] = useState(false);
  const [attendanceMarkedToday, setAttendanceMarkedToday] = useState(false);

  const toIstDateKey = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return y && m && day ? `${y}-${m}-${day}` : '';
  };

  useEffect(()=>{
    const load = async () => {
      const [attendanceData, leaveData] = await Promise.all([
        getMyAttendance(effectiveToken),
        getMyLeaves(effectiveToken),
      ]);
      const list = Array.isArray(attendanceData) ? attendanceData : [];
      setRows(list);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
      const todayKey = toIstDateKey(new Date());
      setAttendanceMarkedToday(list.some((r) => toIstDateKey(r?.date) === todayKey));
    };
    if (effectiveToken) load();
  },[effectiveToken]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromRedirect = params.get('marked') === '1';
    setShowMarkedMessage(fromRedirect || attendanceMarkedToday);
  }, [location.search, attendanceMarkedToday]);

  return (
    <div style={styles.section}>
      <div style={styles.headerRow}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>My Attendance</h3>
          {showMarkedMessage ? (
            <span style={styles.successInline}>Attendance marked for today.</span>
          ) : null}
        </div>
        <button
          type="button"
          style={{
            ...styles.markButton,
            ...(attendanceMarkedToday ? styles.markButtonDisabled : {}),
          }}
          onClick={() => navigate('/employee/profile')}
          disabled={attendanceMarkedToday}
          title={attendanceMarkedToday ? 'Attendance already marked for today' : 'Go to profile to mark attendance'}
        >
          Mark Attendance
        </button>
      </div>
      {rows.length === 0 && leaves.length === 0 ? (
        <div style={styles.empty}>No attendance records.</div>
      ) : null}
      <AttendanceCalendar
        title="Attendance Calendar"
        attendanceRecords={rows}
        leaveRequests={leaves}
      />
    </div>
  );
}

const styles = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  title: { margin: 0, color: '#4b316c', fontSize: 20 },
  markButton: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #6f4a99',
    background: '#6f4a99',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  markButtonDisabled: {
    border: '1px solid #9ca3af',
    background: '#e5e7eb',
    color: '#6b7280',
    cursor: 'not-allowed',
  },
  successInline: {
    color: '#166534',
    fontWeight: 700,
    fontSize: 14,
  },
  empty: { padding: 12, background: '#f7f2fc', border: '1px solid #dfd0f2', borderRadius: 10, color: '#6a5880' },
};
