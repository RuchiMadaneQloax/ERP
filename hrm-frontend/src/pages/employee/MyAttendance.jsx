import React, { useEffect, useState } from 'react';
import { getMyAttendance, getMyLeaves } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function MyAttendance() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [rows, setRows] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(()=>{
    const load = async () => {
      const [attendanceData, leaveData] = await Promise.all([
        getMyAttendance(effectiveToken),
        getMyLeaves(effectiveToken),
      ]);
      setRows(Array.isArray(attendanceData) ? attendanceData : []);
      setLeaves(Array.isArray(leaveData) ? leaveData : []);
    };
    if (effectiveToken) load();
  },[effectiveToken]);

  return (
    <div style={styles.section}>
      <h3 style={styles.title}>My Attendance</h3>
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
  title: { margin: 0, color: '#4b316c', fontSize: 20 },
  empty: { padding: 12, background: '#f7f2fc', border: '1px solid #dfd0f2', borderRadius: 10, color: '#6a5880' },
};
