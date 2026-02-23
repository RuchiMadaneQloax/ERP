import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDesignations,
  getAttendance,
  getAttendanceByEmployee,
  getPayrolls,
  getLeaveRequests,
} from "../services/api";
import formatCurrency from '../utils/formatCurrency';
import AttendanceCalendar from "../components/AttendanceCalendar";

function Dashboard({ token }) {
  const navigate = useNavigate();

  // Some parents (Layout via Routes) don't pass `token` prop — fall back to localStorage.
  const effectiveToken = token ?? localStorage.getItem("token");

  const current = new Date();
  const monthStart = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`;

  const [employees, setEmployees] = useState([]);
  const [attendanceMonth, setAttendanceMonth] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedEmployeeAttendance, setSelectedEmployeeAttendance] = useState([]);
  const [selectedEmployeeLeaves, setSelectedEmployeeLeaves] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeeData = await getEmployees(effectiveToken);
        if (Array.isArray(employeeData.employees)) {
          setEmployees(employeeData.employees);
        }
        // fetch departments, attendance for current month, payrolls and designations in parallel
        const [deptData, attendanceData, payrollData, desigData] = await Promise.all([
          getDepartments(effectiveToken),
          getAttendance(effectiveToken, monthStart),
          getPayrolls(effectiveToken),
          getDesignations(effectiveToken),
        ]);

        if (Array.isArray(deptData.departments)) {
          setDepartments(deptData.departments);
        }

        setAttendanceMonth(Array.isArray(attendanceData) ? attendanceData : []);
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);

        if (Array.isArray(desigData.designations)) {
          setDesignations(desigData.designations);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    if (effectiveToken) fetchData();
  }, [effectiveToken]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setSalary("");
    setSelectedDepartment("");
    setSelectedDesignation("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDepartment || !selectedDesignation) {
      alert("Select department and designation");
      return;
    }

    const employeeData = {
      name,
      email,
      department: selectedDepartment,
      designation: selectedDesignation,
      salary: Number(salary),
    };

    try {
      if (editingId) {
        const updated = await updateEmployee(editingId, employeeData, effectiveToken);
        setEmployees((prev) =>
          prev.map((emp) => (emp._id === editingId ? updated : emp))
        );
      } else {
        const created = await addEmployee(employeeData, effectiveToken);
        setEmployees((prev) => [...prev, created]);
      }

      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id, effectiveToken);
      setEmployees((prev) =>
        prev.filter((emp) => emp._id !== id)
      );
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleEdit = (emp) => {
    setEditingId(emp._id);
    setName(emp.name);
    setEmail(emp.email);
    setSalary(emp.salary);
    setSelectedDepartment(emp.department?._id || "");
    setSelectedDesignation(emp.designation?._id || "");
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    try {
      const res = await getEmployees(effectiveToken, searchTerm);
      if (Array.isArray(res.employees)) {
        setSearchResults(res.employees);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error', err);
      setSearchResults([]);
    }
  };

  const closeDetails = () => setSelectedEmployee(null);

  useEffect(() => {
    const loadSelectedEmployeeRecords = async () => {
      if (!selectedEmployee?._id || !effectiveToken) return;
      try {
        setDetailsLoading(true);
        const [attendanceData, leaveData] = await Promise.all([
          getAttendanceByEmployee(effectiveToken, selectedEmployee._id),
          getLeaveRequests(effectiveToken),
        ]);

        setSelectedEmployeeAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        const ownLeaves = Array.isArray(leaveData)
          ? leaveData.filter((l) => {
              const leaveEmp = l?.employee?._id || l?.employee;
              return String(leaveEmp) === String(selectedEmployee._id);
            })
          : [];
        setSelectedEmployeeLeaves(ownLeaves);
      } catch (error) {
        console.error("Error loading selected employee records:", error);
        setSelectedEmployeeAttendance([]);
        setSelectedEmployeeLeaves([]);
      } finally {
        setDetailsLoading(false);
      }
    };

    loadSelectedEmployeeRecords();
  }, [selectedEmployee?._id, effectiveToken]);
  // Dashboard metrics
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const inactiveEmployees = totalEmployees - activeEmployees;

  // payroll total this month (sum of payroll.finalSalary where payroll.month === current month start)
  const thisMonthPayrollTotal = payrolls
    .filter((p) => p.month === monthStart)
    .reduce((s, p) => s + (Number(p.finalSalary) || 0), 0);

  // attendance percent for current month
  const presentCount = attendanceMonth.filter((a) => a.status === "present").length;
  const halfDayCount = attendanceMonth.filter((a) => a.status === "half-day").length;
  const absentCount = attendanceMonth.filter((a) => a.status === "absent").length;
  const denom = presentCount + halfDayCount + absentCount;
  const attendancePercent = denom > 0 ? Math.round(((presentCount + 0.5 * halfDayCount) / denom) * 100) : 0;

  // employees on leave today (unique employee ids with 'absent' status today)
  const todayISO = new Date().toISOString().slice(0, 10);
  const employeesOnLeave = new Set(
    attendanceMonth.filter((a) => a.status === "absent" && a.date.slice(0,10) === todayISO).map((a) => a.employee?._id || a.employee)
  ).size;

  return (
    <div style={styles.container}>

      {/* Top header */}
      <div style={styles.headerTop}>
        <div>
          <h2 style={styles.title}>Dashboard</h2>
          <p style={styles.subtitle}>Welcome back! Here's your HRMS overview</p>
        </div>

        <div style={styles.headerActions}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              style={styles.searchInput}
            />
            <button onClick={() => handleSearch()} style={styles.searchButton} title="Search">
              <Search size={16} />
            </button>
          </div>

          <button style={styles.iconButton} onClick={() => navigate('/')} title="Notifications">🔔</button>
          <button style={styles.profileButton} onClick={() => {}}>
            JD
          </button>
        </div>
      </div>
      {/* Employee details modal */}
      {selectedEmployee && (
        <div style={styles.modalOverlay} onClick={closeDetails}>
          <div style={styles.modalCard} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0}}>{selectedEmployee.name} <span style={{fontSize:13,color:'#6b7280',fontWeight:500}}>({selectedEmployee.employeeId})</span></h3>
              <div style={{display:'flex',gap:8}}>
                <button onClick={closeDetails} style={styles.clearSearchButton}>Close</button>
              </div>
            </div>

            <div style={styles.modalRow}>
              <div><strong>Email:</strong> {selectedEmployee.email}</div>
              <div><strong>Salary:</strong> {formatCurrency(selectedEmployee.salary)}</div>
            </div>

            <div style={styles.modalRow}>
              <div><strong>Department:</strong> {selectedEmployee.department?.name}</div>
              <div><strong>Designation:</strong> {selectedEmployee.designation?.title}</div>
            </div>

            <div style={styles.modalRow}>
              <div><strong>Status:</strong> {selectedEmployee.status}</div>
              <div><strong>Joining Date:</strong> {new Date(selectedEmployee.joiningDate).toLocaleDateString()}</div>
            </div>

            <div style={{marginTop:12}}>
              {detailsLoading ? (
                <div style={styles.detailsLoading}>Loading records...</div>
              ) : (
                <AttendanceCalendar
                  title={`${selectedEmployee.name} - Attendance`}
                  attendanceRecords={selectedEmployeeAttendance}
                  leaveRequests={selectedEmployeeLeaves}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search results (if any) */}
      {searchResults.length > 0 && (
        <div style={styles.searchResultsCard}>
          <h4 style={{margin:0, marginBottom:8}}>Search results</h4>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {searchResults.map((emp) => (
              <div key={emp._id} style={styles.searchResultRow}>
                <div>
                  <div style={{fontWeight:600}}>{emp.name} <span style={{color:'#6b7280',fontSize:12}}>({emp.employeeId})</span></div>
                  <div style={{fontSize:13,color:'#6b7280'}}>{emp.email} • {formatCurrency(emp.salary)}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button style={styles.viewButton} onClick={() => setSelectedEmployee(emp)}>View</button>
                </div>
              </div>
            ))}
            <div>
              <button style={styles.clearSearchButton} onClick={() => { setSearchResults([]); setSearchTerm(''); }}>Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid: left content + right sidebar */}
      <div style={styles.mainGrid}>

        {/* LEFT: overview, charts, recent */}
        <div style={styles.mainCol}>

          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>👥</div>
              <div>
                <div style={styles.statNumber}>{totalEmployees}</div>
                <div style={styles.statLabel}>Total Employees</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>✅</div>
              <div>
                <div style={styles.statNumber}>{activeEmployees}</div>
                <div style={styles.statLabel}>Active Employees</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>📅</div>
              <div>
                <div style={styles.statNumber}>{employeesOnLeave}</div>
                <div style={styles.statLabel}>On Leave (today)</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>💰</div>
              <div>
                <div style={styles.statNumber}>{formatCurrency(thisMonthPayrollTotal)}</div>
                <div style={styles.statLabel}>This Month Payroll</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>🚫</div>
              <div>
                <div style={styles.statNumber}>{inactiveEmployees}</div>
                <div style={styles.statLabel}>Inactive Employees</div>
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statIcon}>📊</div>
              <div>
                <div style={styles.statNumber}>{attendancePercent}%</div>
                <div style={styles.statLabel}>Attendance (month)</div>
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div style={styles.chartsGrid}>
            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Attendance Trend</h4>
              <div style={styles.chartPlaceholder}>[Attendance chart placeholder]</div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartTitle}>Department Distribution</h4>
              <div style={styles.chartPlaceholder}>[Pie chart placeholder]</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Recent Activity</h3>
            <div style={styles.recentList}>
              {employees.slice(0,5).map((emp, idx) => (
                <div key={emp._id || idx} style={styles.recentItem}>
                  <div style={styles.recentLeft}>
                    <div style={styles.avatar}>{emp.name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                    <div>
                      <div style={{fontWeight:600}}>{emp.name}</div>
                      <div style={{fontSize:13,color:'#6b7280'}}>Checked in</div>
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'#9ca3af'}}>8:45 AM</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT: sidebar with form + employee list (keep all functions) */}
        <aside style={styles.sidebar}>

          <div style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={styles.sectionTitle}>{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
            </div>

            <form onSubmit={handleSubmit} style={styles.formGridSidebar}>
              <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} style={styles.input} />
              <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} style={styles.input} />

              <select value={selectedDepartment} onChange={(e)=>{setSelectedDepartment(e.target.value); setSelectedDesignation('');}} style={styles.input}>
                <option value="">Select Department</option>
                {departments.map(d=> <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>

              <select value={selectedDesignation} onChange={(e)=>setSelectedDesignation(e.target.value)} style={styles.input}>
                <option value="">Select Designation</option>
                {designations.filter(desig=>desig.department?._id===selectedDepartment).map(desig=> <option key={desig._id} value={desig._id}>{desig.title}</option>)}
              </select>

              <input type="number" placeholder="Salary" value={salary} onChange={(e)=>setSalary(e.target.value)} style={styles.input} />

              <div style={{display:'flex',gap:10}}>
                <button type="submit" style={styles.primaryButton}>{editingId ? 'Update' : 'Add'}</button>
                {editingId && <button type="button" onClick={resetForm} style={styles.cancelButton}>Cancel</button>}
              </div>
            </form>
          </div>

          <div>
            <h3 style={styles.sectionTitle}>Employee List</h3>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {employees.map(emp => (
                <div key={emp._id} style={styles.employeeRow}>
                  <div>
                    <div style={{fontWeight:600}}>{emp.name}</div>
                    <div style={{fontSize:12,color:'#6b7280'}}>{emp.department?.name} • {emp.designation?.title}</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button style={styles.editButton} onClick={()=>handleEdit(emp)}>Edit</button>
                    <button style={styles.deleteButton} onClick={()=>handleDelete(emp._id)}>Deactivate</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

export default Dashboard;

/* ================= STYLES ================= */

const styles = {
  container: {
    backgroundColor: "#EDE9E3",
    padding: "30px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: "26px",
    fontWeight: "700",
  },

  subtitle: {
    fontSize: "14px",
    color: "#666",
  },

  navButton: {
    marginRight: "10px",
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#4F6F52",
    color: "#fff",
    cursor: "pointer",
  },

  logoutButton: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#C0392B",
    color: "#fff",
    cursor: "pointer",
  },

  card: {
    backgroundColor: "#F7F6F3",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },

  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "15px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },

  input: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },

  primaryButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#355E3B",
    color: "#fff",
    cursor: "pointer",
  },

  cancelButton: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#777",
    color: "#fff",
    marginLeft: "10px",
    cursor: "pointer",
  },

  employeeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "15px",
  },

  employeeCard: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "10px",
    border: "1px solid #ddd",
  },

  employeeName: {
    fontWeight: "600",
    marginBottom: "5px",
  },

  employeeInfo: {
    fontSize: "13px",
    marginBottom: "3px",
  },

  actionRow: {
    marginTop: "10px",
  },

  editButton: {
    marginRight: "8px",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2980B9",
    color: "#fff",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "6px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#C0392B",
    color: "#fff",
    cursor: "pointer",
  },
  /* New layout styles */
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerActions: {
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },

  searchInput: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #ddd'
  },

  profileButton: {
    backgroundColor: '#f3f4f6',
    border: 'none',
    padding: '8px 12px',
    borderRadius: 999,
    cursor: 'pointer'
  },

  iconButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16
  },

  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 360px',
    gap: 24,
    alignItems: 'start'
  },

  mainCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16
  },

  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    border: '1px solid #eee'
  },

  statIcon: {
    fontSize: 22,
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 8
  },

  statNumber: {
    fontSize: 20,
    fontWeight: 700
  },

  statLabel: {
    fontSize: 12,
    color: '#6b7280'
  },

  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 16
  },

  chartCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    border: '1px solid #eee'
  },

  chartTitle: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 600
  },

  chartPlaceholder: {
    minHeight: 150,
    background: 'linear-gradient(180deg, rgba(79,111,82,0.06), rgba(255,255,255,0))',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af'
  },

  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },

  searchResultsCard: {
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    border: '1px solid #eee',
    marginTop: 12
  },

  searchResultRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, borderRadius:8, background:'#fbfbfb' },

  viewButton: { padding:'6px 10px', borderRadius:8, border:'none', backgroundColor:'#355E3B', color:'#fff', cursor:'pointer' },

  clearSearchButton: { padding:'6px 10px', borderRadius:8, border:'1px solid #ddd', background:'transparent', cursor:'pointer' },

  searchButton: { background:'#355E3B', border:'none', padding:8, borderRadius:8, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },

  /* Modal */
  modalOverlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 },
  modalCard: { background:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:700, boxShadow:'0 6px 24px rgba(0,0,0,0.15)' },
  modalRow: { display:'flex', justifyContent:'space-between', gap:10, marginBottom:8 },
  detailsLoading: { padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', color: '#6b7280', background: '#f9fafb' },

  recentItem: {
    background: '#fff',
    padding: 12,
    borderRadius: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #eee'
  },

  recentLeft: { display: 'flex', gap: 12, alignItems: 'center' },

  avatar: { width:36, height:36, borderRadius:999, background:'#eef2e9', display:'flex',alignItems:'center',justifyContent:'center', fontWeight:700 },

  sidebar: { background: 'transparent' },

  formGridSidebar: { display:'grid', gap:10 },

  employeeRow: { background:'#fff', padding:10, borderRadius:8, display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid #eee' }
};
