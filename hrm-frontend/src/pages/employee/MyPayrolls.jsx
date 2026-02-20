import React, { useEffect, useState } from 'react';

function formatMonthToMMYYYY(input) {
  if (!input) return '';
  const d = (input instanceof Date) ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}-${yyyy}`;
}
import { getMyPayrolls } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import formatCurrency from '../../utils/formatCurrency';

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
    <div>
      <h3>My Payslips</h3>
      {payrolls.length === 0 ? (
        <p>No payroll records found.</p>
      ) : (
        <table style={{width:'100%'}}>
          <thead><tr><th>Month</th><th>Base</th><th>Overtime</th><th>Final Salary</th></tr></thead>
          <tbody>
            {payrolls.map(p=> (
              <tr key={p._id}>
                <td>{formatMonthToMMYYYY(p.month)}</td>
                <td>{formatCurrency(p.baseSalary)}</td>
                <td>{formatCurrency(p.overtimePay)}</td>
                <td>{formatCurrency(p.finalSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
