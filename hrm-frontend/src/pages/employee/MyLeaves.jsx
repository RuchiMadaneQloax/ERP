import React, { useEffect, useState } from 'react';
import formatDate from '../../utils/formatDate';
import { getMyLeaves } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MyLeaves() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [leaves, setLeaves] = useState([]);

  useEffect(()=>{
    const load = async () => {
      const data = await getMyLeaves(effectiveToken);
      setLeaves(Array.isArray(data) ? data : []);
    };
    if (effectiveToken) load();
  },[effectiveToken]);

  return (
    <div>
      <h3>My Leaves</h3>
      {leaves.length === 0 ? (
        <p>No leave records found.</p>
      ) : (
        <table style={{width:'100%'}}>
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
          <tbody>
            {leaves.map(l=> (
              <tr key={l._id}>
                <td>{l.leaveType?.name}</td>
                <td>{formatDate(l.startDate)}</td>
                <td>{formatDate(l.endDate)}</td>
                <td>{l.totalDays}</td>
                <td>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
