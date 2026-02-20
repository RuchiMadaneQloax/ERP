import React, { useEffect, useState } from 'react';
import formatDate from '../../utils/formatDate';
import { getMyAttendance } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MyAttendance() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [rows, setRows] = useState([]);

  useEffect(()=>{
    const load = async () => {
      const data = await getMyAttendance(effectiveToken);
      setRows(Array.isArray(data) ? data : []);
    };
    if (effectiveToken) load();
  },[effectiveToken]);

  return (
    <div>
      <h3>My Attendance</h3>
      {rows.length === 0 ? (
        <p>No attendance records.</p>
      ) : (
        <table style={{width:'100%'}}>
          <thead><tr><th>Date</th><th>Status</th><th>Overtime</th><th>Holiday</th></tr></thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r._id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.status}</td>
                <td>{r.overtimeHours}</td>
                <td>{r.isHoliday ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
