import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/api";

function Payroll({ token }) {
  const navigate = useNavigate();

  const effectiveToken = token ?? localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState("");

  const [payrollResult, setPayrollResult] = useState(null);
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // =============================
  // LOAD EMPLOYEES
  // =============================
  useEffect(() => {
    const loadEmployees = async () => {
      const data = await getEmployees(effectiveToken);
      if (Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    };

    if (effectiveToken) loadEmployees();
  }, [effectiveToken]);

  // =============================
  // FETCH PAYROLL HISTORY
  // =============================
  const fetchPayrollHistory = async (employeeId) => {
    if (!employeeId) return;

    const response = await fetch(
      `http://localhost:5000/api/payroll?employee=${employeeId}`,
      {
        headers: {
          Authorization: `Bearer ${effectiveToken}`,
        },
      }
    );

    const data = await response.json();
    if (Array.isArray(data)) {
      setPayrollHistory(data);
    }
  };

  useEffect(() => {
    if (selectedEmployee) {
      fetchPayrollHistory(selectedEmployee);
    }
  }, [selectedEmployee]);

  // =============================
  // GENERATE PAYROLL
  // =============================
  const generatePayroll = async () => {
    if (!selectedEmployee || !month) {
      alert("Select employee and month");
      return;
    }

    setLoading(true);

    const response = await fetch(
      "http://localhost:5000/api/payroll",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          employee: selectedEmployee,
          month: month + "-01",
        }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      setPayrollResult(result);
      fetchPayrollHistory(selectedEmployee);
      alert("Payroll generated successfully");
    } else {
      alert(result.message);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>

      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Payroll</h2>
          <p style={styles.pageSubtitle}>Generate and review payroll for employees</p>
        </div>
        <div>
          <button style={styles.backButton} onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Generate Payroll</h3>

          <div style={styles.formRow}>
            <label style={styles.label}>Employee</label>
            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={styles.select}>
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Month</label>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={styles.input} />
          </div>

          <div style={{marginTop:12}}>
            <button onClick={generatePayroll} disabled={loading} style={styles.primaryButton}>{loading ? 'Generating...' : 'Generate Payroll'}</button>
          </div>

          {payrollResult && (
            <div style={{marginTop:16}}>
              <h4 style={{margin:0}}>Payroll Breakdown</h4>
              <div style={{marginTop:8}}>
                <div>Base Salary: ₹{payrollResult.baseSalary}</div>
                <div>Present Days: {payrollResult.presentDays}</div>
                <div>Absent Days: {payrollResult.absentDays}</div>
                <div>Half Days: {payrollResult.halfDays}</div>
                <div style={{marginTop:8,fontWeight:700}}>Final Salary: ₹{payrollResult.finalSalary}</div>
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Payroll History</h3>

          {payrollHistory.length > 0 ? (
            <div style={{overflowX:'auto'}}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Month</th>
                    <th style={styles.th}>Final Salary</th>
                    <th style={styles.th}>Generated At</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollHistory.map((record) => (
                    <tr key={record._id}>
                      <td style={styles.td}>{record.month}</td>
                      <td style={styles.td}>₹{record.finalSalary}</td>
                      <td style={styles.td}>{new Date(record.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{color:'#6b7280'}}>No payroll records found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Payroll;

const styles = {
  container: { backgroundColor: '#EDE9E3', minHeight: '100vh', padding: 28 },
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 },
  pageTitle: { fontSize:24, fontWeight:700, margin:0 },
  pageSubtitle: { color:'#6b7280', marginTop:6 },
  backButton: { padding:'8px 12px', borderRadius:8, border:'none', background:'#fff', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  grid: { display:'grid', gridTemplateColumns:'1fr 480px', gap:20 },
  card: { background:'#F7F6F3', padding:16, borderRadius:12, border:'1px solid #eee' },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:12 },
  formRow: { display:'flex', flexDirection:'column', marginBottom:10 },
  label: { fontSize:13, color:'#374151', marginBottom:6 },
  select: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' },
  input: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' },
  primaryButton: { padding:'10px 14px', borderRadius:8, border:'none', background:'#355E3B', color:'#fff', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:8, borderBottom:'1px solid #eee', color:'#6b7280' },
  td: { padding:8, borderBottom:'1px solid #f3f3f3' }
};
