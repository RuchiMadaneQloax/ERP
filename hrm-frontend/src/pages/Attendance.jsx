import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/api";
import formatDate from '../utils/formatDate';

function Attendance({ token }) {
  const navigate = useNavigate();

  // fallback to localStorage token if parent didn't pass it
  const effectiveToken = token ?? localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("present");
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [isHoliday, setIsHoliday] = useState(false);

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // =============================
  // LOAD EMPLOYEES
  // =============================
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees(effectiveToken);
        if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    if (effectiveToken) loadEmployees();
  }, [effectiveToken]);

  // =============================
  // FETCH ATTENDANCE HISTORY
  // =============================
  const fetchAttendance = async (employeeId) => {
    if (!employeeId) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/attendance?employee=${employeeId}`,
        {
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        }
      );

      const data = await response.json();

      if (Array.isArray(data)) {
        setAttendanceRecords(data);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  // Fetch history when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      fetchAttendance(selectedEmployee);
    }
  }, [selectedEmployee]);

  // =============================
  // MARK ATTENDANCE
  // =============================
  const markAttendance = async () => {
    if (!selectedEmployee || !date) {
      alert("Please select employee and date");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/attendance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${effectiveToken}`,
          },
          body: JSON.stringify({
            employee: selectedEmployee,
            date,
            status,
            overtimeHours: Number(overtimeHours) || 0,
            isHoliday: Boolean(isHoliday),
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert("Attendance marked successfully");
        setDate("");
        fetchAttendance(selectedEmployee);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>

      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Attendance</h2>
          <p style={styles.pageSubtitle}>Mark attendance and review history</p>
        </div>
        <div>
          <button style={styles.backButton} onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Mark Attendance</h3>

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
            <label style={styles.label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.select}>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half-day">Half Day</option>
            </select>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Overtime hours (optional)</label>
            <input type="number" min="0" value={overtimeHours} onChange={(e)=>setOvertimeHours(e.target.value)} style={styles.input} />
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}><input type="checkbox" checked={isHoliday} onChange={(e)=>setIsHoliday(e.target.checked)} />&nbsp;Is Holiday</label>
          </div>

          <div style={{marginTop:12}}>
            <button onClick={markAttendance} disabled={loading} style={styles.primaryButton}>{loading ? 'Marking...' : 'Mark Attendance'}</button>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Attendance History</h3>

          {attendanceRecords.length > 0 ? (
            <div style={{overflowX:'auto'}}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Overtime</th>
                    <th style={styles.th}>Holiday</th>
                    <th style={styles.th}>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((record) => (
                    <tr key={record._id}>
                      <td style={styles.td}>{formatDate(record.date)}</td>
                      <td style={styles.td}>{record.status}</td>
                      <td style={styles.td}>{record.overtimeHours ?? 0}</td>
                      <td style={styles.td}>{record.isHoliday ? 'Yes' : 'No'}</td>
                      <td style={styles.td}>{record.markedBy?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{color:'#6b7280'}}>No attendance records found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Attendance;

const styles = {
  container: {
    backgroundColor: '#efe9f6',
    minHeight: '100vh',
    padding: 28,
    boxSizing: 'border-box'
  },
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 },
  pageTitle: { fontSize:24, fontWeight:700, margin:0 },
  pageSubtitle: { color:'#6b7280', marginTop:6 },
  backButton: { padding:'8px 12px', borderRadius:8, border:'none', background:'#fff', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  grid: { display:'grid', gridTemplateColumns:'1fr 480px', gap:20 },
  card: { background:'#faf7ff', padding:16, borderRadius:12, border:'1px solid #eee' },
  sectionTitle: { fontSize:16, fontWeight:600, marginBottom:12 },
  formRow: { display:'flex', flexDirection:'column', marginBottom:10 },
  label: { fontSize:13, color:'#374151', marginBottom:6 },
  select: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' },
  input: { padding:'10px 12px', borderRadius:8, border:'1px solid #ddd' },
  primaryButton: { padding:'10px 14px', borderRadius:8, border:'1px solid #d9c8f6', background:'#f3ecff', color:'#3f2a5f', cursor:'pointer' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', padding:8, borderBottom:'1px solid #eee', color:'#6b7280' },
  td: { padding:8, borderBottom:'1px solid #f3f3f3' }
};

