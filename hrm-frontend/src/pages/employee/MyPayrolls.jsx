import React, { useEffect, useState } from 'react';
import { getMyPayrolls } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import formatCurrency from '../../utils/formatCurrency';
import formatDate from '../../utils/formatDate';

export default function MyPayrolls() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [payrolls, setPayrolls] = useState([]);

  useEffect(()=>{
    const load = async () => {
      const data = await getMyPayrolls(effectiveToken);
      setPayrolls(Array.isArray(data) ? data : []);
    };
    if (effectiveToken) load();
  },[effectiveToken]);

  return (
    <div style={styles.section}>
      <h3 style={styles.title}>My Payslips</h3>
      {payrolls.length === 0 ? (
        <div style={styles.empty}>No payroll records found.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Month</th>
              <th style={styles.th}>Base</th>
              <th style={styles.th}>Overtime</th>
              <th style={styles.th}>Final Salary</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.map(p=> (
              <tr key={p._id} style={styles.tr}>
                <td style={styles.td}>{formatDate(p.month)}</td>
                <td style={styles.td}>{formatCurrency(p.baseSalary)}</td>
                <td style={styles.td}>{formatCurrency(p.overtimePay)}</td>
                <td style={{ ...styles.td, fontWeight: 700, color: '#55327d' }}>{formatCurrency(p.finalSalary)}</td>
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
};
