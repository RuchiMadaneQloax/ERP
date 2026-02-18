import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees, getLeaveTypes, applyLeave, getLeaveRequests, decodeToken } from "../services/api";

function Leave({ token }) {
  const navigate = useNavigate();
  const effectiveToken = token ?? localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);

  const [userRole, setUserRole] = useState(null);

  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const empRes = await getEmployees(effectiveToken);
        if (Array.isArray(empRes.employees)) setEmployees(empRes.employees);

        const lt = await getLeaveTypes(effectiveToken);
        if (Array.isArray(lt)) setLeaveTypes(lt);

        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
      } catch (err) {
        console.error("Error loading leave data", err);
      }
    };

    if (effectiveToken) load();
  }, [effectiveToken]);

  // decode role from token so we can show/hide UI
  useEffect(() => {
    if (!effectiveToken) return;
    try {
      const payload = decodeToken(effectiveToken);
      setUserRole(payload?.role || null);
    } catch (err) {
      setUserRole(null);
    }
  }, [effectiveToken]);

  const submitLeave = async (e) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedLeaveType || !startDate || !endDate) {
      alert('Please fill all required fields');
      return;
    }

    // client-side date validation
    const s = new Date(startDate);
    const en = new Date(endDate);
    if (s > en) {
      alert('Start date cannot be after end date');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employee: selectedEmployee,
        leaveType: selectedLeaveType,
        startDate,
        endDate,
        reason,
      };

      const res = await applyLeave(payload, effectiveToken);
      if (res && res._id) {
        alert('Leave applied');
        // refresh list
        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
        // reset
        setSelectedEmployee("");
        setSelectedLeaveType("");
        setStartDate("");
        setEndDate("");
        setReason("");
      } else {
        alert(res.message || 'Could not apply leave');
      }
    } catch (err) {
      console.error('Apply leave error', err);
      alert('Error applying leave');
    }
    setLoading(false);
  };

  const getRemainingFor = (employee, leaveTypeId) => {
    if (!employee) return null;
    const lb = (employee.leaveBalances || []).find(lb => lb.leaveType && String(lb.leaveType) === String(leaveTypeId));
    if (lb) return (lb.allocated || 0) - (lb.used || 0);
    // fallback: find leaveType allocation
    const lt = leaveTypes.find(l => String(l._id) === String(leaveTypeId));
    return lt ? (lt.maxDaysPerYear || 0) : null;
  };

  const handleUpdateStatus = async (id, status) => {
    if (!confirm(`Mark this request as ${status}?`)) return;
    try {
      const res = await (await import('../services/api')).updateLeaveStatus(id, status, effectiveToken);
      if (res && res._id) {
        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
      } else {
        alert(res.message || 'Could not update status');
      }
    } catch (err) {
      console.error('Update status error', err);
      alert('Error updating status');
    }
  };

  const handleAdjustBalance = async (employeeId, leaveTypeId) => {
    const addStr = prompt('Enter number of days to add to allocated balance (use negative to reduce):', '0');
    if (addStr === null) return;
    const delta = Number(addStr);
    if (Number.isNaN(delta)) {
      alert('Invalid number');
      return;
    }

    try {
      const { adjustLeaveBalance } = await import('../services/api');
      const res = await adjustLeaveBalance(employeeId, { leaveTypeId, deltaAllocated: delta }, effectiveToken);
      if (res && res._id) {
        alert('Balance adjusted');
        // refresh lists
        const lr = await getLeaveRequests(effectiveToken);
        if (Array.isArray(lr)) setLeaveRequests(lr);
        const empRes = await getEmployees(effectiveToken);
        if (Array.isArray(empRes.employees)) setEmployees(empRes.employees);
      } else {
        alert(res.message || 'Could not adjust balance');
      }
    } catch (err) {
      console.error('Adjust balance error', err);
      alert('Error adjusting balance');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>Leave Management</h2>
          <p style={styles.pageSubtitle}>Apply for leave or review recent requests</p>
        </div>
        <div>
          <button style={styles.backButton} onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </div>

      <div style={styles.grid}>
        {userRole === 'hr' ? (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Apply for Leave</h3>

            <div style={styles.formRow}>
              <label style={styles.label}>Employee</label>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} style={styles.select}>
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Leave Type</label>
              <select value={selectedLeaveType} onChange={(e) => setSelectedLeaveType(e.target.value)} style={styles.select}>
                <option value="">Select Leave Type</option>
                {leaveTypes.map(lt => (
                  <option key={lt._id} value={lt._id}>{lt.name} ({lt.maxDaysPerYear} days/yr)</option>
                ))}
              </select>
              {selectedEmployee && selectedLeaveType && (
                <div style={{marginTop:8,fontSize:13,color:'#374151'}}>
                  Remaining: <strong>{getRemainingFor(employees.find(e=>e._id===selectedEmployee), selectedLeaveType)}</strong> days
                </div>
              )}
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={styles.input} />
            </div>

            <div style={styles.formRow}>
              <label style={styles.label}>Reason</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} style={{...styles.input, minHeight:80}} />
            </div>

            <div style={{marginTop:12}}>
              <button onClick={submitLeave} disabled={loading} style={styles.primaryButton}>{loading ? 'Submitting...' : 'Apply Leave'}</button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Apply for Leave</h3>
            <p style={{color:'#6b7280'}}>Only HR users can apply for leave. You can review requests below.</p>
          </div>
        )}

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Recent Leave Requests</h3>

          {leaveRequests.length > 0 ? (
            <div style={{overflowX:'auto'}}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Days</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Remaining</th>
                    <th style={styles.th}>Actions</th>
                    <th style={styles.th}>Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(req => (
                    <tr key={req._id}>
                      <td style={styles.td}>{req.employee?.name}</td>
                      <td style={styles.td}>{req.leaveType?.name}</td>
                      <td style={styles.td}>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</td>
                      <td style={styles.td}>{req.totalDays}</td>
                      <td style={styles.td}>{req.status}</td>
                      <td style={styles.td}>{getRemainingFor(req.employee, req.leaveType?._id)}</td>
                      <td style={styles.td}>
                        {userRole === 'superadmin' ? (
                          <div style={{display:'flex',gap:8}}>
                            <button style={styles.approveButton} onClick={() => handleUpdateStatus(req._id, 'approved')}>Approve</button>
                            <button style={styles.rejectButton} onClick={() => handleUpdateStatus(req._id, 'rejected')}>Reject</button>
                            <button style={styles.adjustButton} onClick={() => handleAdjustBalance(req.employee?._id || req.employee, req.leaveType?._id)}>Adjust Balance</button>
                          </div>
                        ) : (
                          <span style={{color:'#6b7280'}}>—</span>
                        )}
                      </td>
                      <td style={styles.td}>{new Date(req.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{color:'#6b7280'}}>No leave requests found.</p>
          )}

        </div>
      </div>
    </div>
  );
}

export default Leave;

const styles = {
  container: {
    backgroundColor: '#EDE9E3',
    minHeight: '100vh',
    padding: 28,
    boxSizing: 'border-box'
  },
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
  ,
  approveButton: { padding:'6px 8px', borderRadius:8, border:'none', background:'#10b981', color:'#fff', cursor:'pointer' },
  rejectButton: { padding:'6px 8px', borderRadius:8, border:'none', background:'#ef4444', color:'#fff', cursor:'pointer' }
  ,
  adjustButton: { padding:'6px 8px', borderRadius:8, border:'none', background:'#2563eb', color:'#fff', cursor:'pointer' }
};
