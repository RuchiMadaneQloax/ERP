import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  decodeToken,
  getDepartments,
  getDesignations,
  getAttendance,
  getAttendanceByEmployee,
  getAdminProfile,
  getAdmins,
  createAdmin,
  updateAdminAccount,
  deleteAdminAccount,
  getPayrolls,
  getLeaveRequests,
} from "../services/api";
import formatCurrency from "../utils/formatCurrency";
import AttendanceCalendar from "../components/AttendanceCalendar";

const PERMISSION_GROUPS = [
  {
    heading: "Leaves",
    options: [
      { key: "leave:view", label: "View" },
      { key: "leave:approve", label: "Accept/ Reject" },
    ],
  },
  {
    heading: "Attendance",
    options: [
      { key: "attendance:view", label: "View" },
      { key: "attendance:mark", label: "Mark" },
    ],
  },
  {
    heading: "Payroll",
    options: [
      { key: "payroll:view", label: "View" },
      { key: "payroll:generate", label: "Generate" },
    ],
  },
  {
    heading: "Employees",
    options: [
      { key: "employee:view", label: "View" },
      { key: "employee:edit", label: "Edit" },
    ],
  },
];

function Dashboard({ token }) {
  const navigate = useNavigate();
  const effectiveToken = token ?? localStorage.getItem("token");
  const decoded = decodeToken(effectiveToken);

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
  const [selectedEmployeeRowId, setSelectedEmployeeRowId] = useState(null);

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");

  const [adminProfile, setAdminProfile] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState("hr");
  const [createAdminPermissions, setCreateAdminPermissions] = useState(["leave:view", "attendance:view"]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedAdminRowId, setSelectedAdminRowId] = useState(null);
  const [permissionEditorOpen, setPermissionEditorOpen] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState([]);

  const isSuperadmin =
    decoded?.role === "superadmin" &&
    ["client@company.com", "dev@qloax.com"].includes(String(adminProfile?.email || "").toLowerCase());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeeData = await getEmployees(effectiveToken);
        if (Array.isArray(employeeData.employees)) setEmployees(employeeData.employees);

        const [deptData, attendanceData, payrollData, desigData] = await Promise.all([
          getDepartments(effectiveToken),
          getAttendance(effectiveToken, monthStart),
          getPayrolls(effectiveToken),
          getDesignations(effectiveToken),
        ]);

        if (Array.isArray(deptData.departments)) setDepartments(deptData.departments);
        if (Array.isArray(desigData.designations)) setDesignations(desigData.designations);
        setAttendanceMonth(Array.isArray(attendanceData) ? attendanceData : []);
        setPayrolls(Array.isArray(payrollData) ? payrollData : []);

        try {
          const profile = await getAdminProfile(effectiveToken);
          setAdminProfile(profile);
          if (
            profile?.role === "superadmin" &&
            ["client@company.com", "dev@qloax.com"].includes(String(profile?.email || "").toLowerCase())
          ) {
            const adminList = await getAdmins(effectiveToken);
            setAdmins(Array.isArray(adminList) ? adminList : []);
          } else {
            setAdmins([]);
          }
        } catch {
          setAdminProfile(null);
          setAdmins([]);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    };

    if (effectiveToken) fetchData();
  }, [effectiveToken, monthStart]);

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
          ? leaveData.filter((l) => String(l?.employee?._id || l?.employee) === String(selectedEmployee._id))
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
    const normalizedName = String(name || "").trim().replace(/\s+/g, " ");
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const fullNameRegex = /^[A-Za-z][A-Za-z'\-.\s]*\s+[A-Za-z][A-Za-z'\-.\s]*$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!fullNameRegex.test(normalizedName)) {
      alert("Enter full name (first and last name)");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      alert("Enter a valid email address");
      return;
    }
    if (!selectedDepartment || !selectedDesignation) {
      alert("Select department and designation");
      return;
    }

    const employeeData = {
      name: normalizedName,
      email: normalizedEmail,
      department: selectedDepartment,
      designation: selectedDesignation,
      salary: Number(salary),
    };

    try {
      if (editingId) {
        const updated = await updateEmployee(editingId, employeeData, effectiveToken);
        setEmployees((prev) => prev.map((emp) => (emp._id === editingId ? updated : emp)));
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
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
      if (selectedEmployeeRowId === id) setSelectedEmployeeRowId(null);
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
      setSearchResults(Array.isArray(res.employees) ? res.employees : []);
    } catch (err) {
      console.error("Search error", err);
      setSearchResults([]);
    }
  };

  const closeDetails = () => setSelectedEmployee(null);

  const refreshAdmins = async () => {
    const list = await getAdmins(effectiveToken);
    setAdmins(Array.isArray(list) ? list : []);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!adminName || !adminEmail || !adminPassword) {
      alert("Name, email and password are required");
      return;
    }
    try {
      setAdminLoading(true);
      const res = await createAdmin(
        {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: adminRole,
          permissions: createAdminPermissions,
        },
        effectiveToken
      );
      if (res?.message) {
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
        setAdminRole("hr");
        setCreateAdminPermissions(["leave:view", "attendance:view"]);
        await refreshAdmins();
      } else {
        alert(res?.message || "Could not create admin");
      }
    } catch {
      alert("Error creating admin");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!confirm("Delete this admin account?")) return;
    try {
      setAdminLoading(true);
      const res = await deleteAdminAccount(id, effectiveToken);
      if (res?.message) {
        await refreshAdmins();
        if (selectedAdminRowId === id) setSelectedAdminRowId(null);
      }
      else alert(res?.message || "Could not delete admin");
    } catch {
      alert("Error deleting admin");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleToggleActive = async (admin) => {
    try {
      setAdminLoading(true);
      const res = await updateAdminAccount(admin._id, { isActive: !admin.isActive }, effectiveToken);
      if (res?._id) await refreshAdmins();
      else alert(res?.message || "Could not update account status");
    } catch {
      alert("Error updating account status");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEditAdmin = async (admin) => {
    const newName = prompt("Admin name", admin.name || "");
    if (newName === null) return;
    const newEmail = prompt("Admin email", admin.email || "");
    if (newEmail === null) return;
    const newRole = prompt("Admin role (superadmin/hr/manager)", admin.role || "hr");
    if (newRole === null) return;
    const role = String(newRole).trim().toLowerCase();
    if (!["superadmin", "hr", "manager"].includes(role)) {
      alert("Invalid role");
      return;
    }
    try {
      setAdminLoading(true);
      const res = await updateAdminAccount(
        admin._id,
        { name: newName.trim(), email: newEmail.trim().toLowerCase(), role },
        effectiveToken
      );
      if (res?._id) await refreshAdmins();
      else alert(res?.message || "Could not edit admin");
    } catch {
      alert("Error editing admin");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSetPermissions = async (admin, permissions) => {
    try {
      setAdminLoading(true);
      const res = await updateAdminAccount(admin._id, { permissions: permissions || [] }, effectiveToken);
      if (res?._id) {
        await refreshAdmins();
        setPermissionEditorOpen(false);
      }
      else alert(res?.message || "Could not update permissions");
    } catch {
      alert("Error updating permissions");
    } finally {
      setAdminLoading(false);
    }
  };

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const thisMonthPayrollTotal = payrolls
    .filter((p) => p.month === monthStart)
    .reduce((s, p) => s + (Number(p.finalSalary) || 0), 0);
  const todayISO = new Date().toISOString().slice(0, 10);
  const employeesOnLeave = new Set(
    attendanceMonth
      .filter((a) => a.status === "absent" && a.date.slice(0, 10) === todayISO)
      .map((a) => a.employee?._id || a.employee)
  ).size;

  return (
    <div style={styles.container}>
      <div style={styles.headerTop}>
        <div>
          <h2 style={styles.title}>Dashboard</h2>
          <p style={styles.subtitle}>Welcome back! Here is your HRMS overview</p>
        </div>

        <div style={styles.headerActions}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              style={styles.searchInput}
            />
            <button onClick={handleSearch} style={styles.searchButton} title="Search">
              <Search size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedEmployee && (
        <div style={styles.modalOverlay} onClick={closeDetails}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>
                {selectedEmployee.name}{" "}
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                  ({selectedEmployee.employeeId})
                </span>
              </h3>
              <button onClick={closeDetails} style={styles.clearSearchButton}>Close</button>
            </div>

            <div style={styles.modalRow}>
              <div><strong>Email:</strong> {selectedEmployee.email}</div>
              <div><strong>Salary:</strong> {formatCurrency(selectedEmployee.salary)}</div>
            </div>
            <div style={styles.modalRow}>
              <div><strong>Department:</strong> {selectedEmployee.department?.name}</div>
              <div><strong>Designation:</strong> {selectedEmployee.designation?.title}</div>
            </div>

            <div style={{ marginTop: 12 }}>
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

      {searchResults.length > 0 && (
        <div style={styles.searchResultsCard}>
          <h4 style={{ margin: 0, marginBottom: 8 }}>Search results</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {searchResults.map((emp) => (
              <div key={emp._id} style={styles.searchResultRow}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {emp.name} <span style={{ color: "#6b7280", fontSize: 12 }}>({emp.employeeId})</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {emp.email} - {formatCurrency(emp.salary)}
                  </div>
                </div>
                <button style={styles.viewButton} onClick={() => navigate(`/employees/${emp._id}`)}>View</button>
              </div>
            ))}
            <button style={styles.clearSearchButton} onClick={() => { setSearchResults([]); setSearchTerm(""); }}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div style={styles.mainGrid}>
        <div style={styles.mainCol}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}><div style={styles.statIcon}>E</div><div><div style={styles.statNumber}>{totalEmployees}</div><div style={styles.statLabel}>Total Employees</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>A</div><div><div style={styles.statNumber}>{activeEmployees}</div><div style={styles.statLabel}>Active Employees</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>L</div><div><div style={styles.statNumber}>{employeesOnLeave}</div><div style={styles.statLabel}>On Leave (today)</div></div></div>
            <div style={styles.statCard}><div style={styles.statIcon}>P</div><div><div style={styles.statNumber}>{formatCurrency(thisMonthPayrollTotal)}</div><div style={styles.statLabel}>This Month Payroll</div></div></div>
          </div>

          {isSuperadmin && (
            <div style={styles.card}>
              <h3 style={styles.sectionTitle}>Admin Management</h3>
              <div style={styles.adminGrid}>
                <div>
                  <h4 style={styles.subSectionTitle}>Create Admin</h4>
                  <form onSubmit={handleCreateAdmin} style={styles.formGridSidebar}>
                    <input placeholder="Admin Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} style={styles.input} />
                    <input placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} style={styles.input} />
                    <input type="password" placeholder="Temporary Password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} style={styles.input} />
                    <select value={adminRole} onChange={(e) => setAdminRole(e.target.value)} style={styles.input}>
                      <option value="hr">HR</option>
                      <option value="manager">Manager</option>
                      <option value="superadmin">Superadmin</option>
                    </select>
                    <div style={styles.createPermissionsBox}>
                      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "#374151" }}>
                        Permissions
                      </div>
                      <div style={styles.permissionGroups}>
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={`create-group-${group.heading}`} style={styles.permissionGroup}>
                            <div style={styles.permissionGroupTitle}>{group.heading}</div>
                            <div style={styles.permissionsList}>
                              {group.options.map((opt) => (
                                <label key={`create-${opt.key}`} style={styles.permissionItem}>
                                  <input
                                    type="checkbox"
                                    checked={createAdminPermissions.includes(opt.key)}
                                    onChange={(e) => {
                                      setCreateAdminPermissions((prev) =>
                                        e.target.checked
                                          ? Array.from(new Set([...prev, opt.key]))
                                          : prev.filter((p) => p !== opt.key)
                                      );
                                    }}
                                  />
                                  <span>{opt.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="submit" disabled={adminLoading} style={styles.primaryButton}>
                      {adminLoading ? "Saving..." : "Create Admin"}
                    </button>
                  </form>
                </div>

                <div>
                  <h4 style={styles.subSectionTitle}>Admins List</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {admins.map((a) => (
                      <div
                        key={a._id}
                        style={{
                          ...styles.employeeRow,
                          cursor: "pointer",
                          borderColor: selectedAdminRowId === a._id ? "#6f4a99" : "#eee",
                          background: selectedAdminRowId === a._id ? "#f4edff" : "#fff",
                        }}
                        onClick={() => {
                          setSelectedAdminRowId(selectedAdminRowId === a._id ? null : a._id);
                          setPermissionEditorOpen(false);
                        }}
                        onDoubleClick={() => navigate(`/admins/${a._id}`)}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {a.name} <span style={{ fontSize: 12, color: "#6b7280" }}>({a.email})</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            Role: {a.role} • Status: {a.isActive ? "Active" : "Inactive"} • Permissions: {(a.permissions || []).join(", ") || "none"}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{a.isActive ? "Active" : "Inactive"}</div>
                      </div>
                    ))}
                    {admins.length === 0 && <div style={styles.emptyHint}>No admins found.</div>}
                  </div>

                  {selectedAdminRowId && (
                    <div style={styles.employeeActionPanel}>
                      {(() => {
                        const selectedAdmin = admins.find((a) => a._id === selectedAdminRowId);
                        if (!selectedAdmin) return null;
                        return (
                          <>
                            <div style={{ fontWeight: 700, marginBottom: 8 }}>
                              Actions for {selectedAdmin.name}
                            </div>
                            <div style={styles.actionList}>
                              <button
                                style={styles.actionButton}
                                disabled={adminLoading}
                                onClick={() => navigate(`/admins/${selectedAdmin._id}`)}
                              >
                                View Details
                              </button>
                              <button
                                style={styles.actionButton}
                                disabled={adminLoading}
                                onClick={() => handleEditAdmin(selectedAdmin)}
                              >
                                Edit
                              </button>
                              <button
                                style={styles.actionButton}
                                disabled={adminLoading}
                                onClick={() => navigate(`/admins/${selectedAdmin._id}`)}
                              >
                                Permissions
                              </button>
                              <button
                                style={styles.actionButton}
                                disabled={adminLoading}
                                onClick={() => handleToggleActive(selectedAdmin)}
                              >
                                {selectedAdmin.isActive ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                style={styles.actionButtonDanger}
                                disabled={adminLoading}
                                onClick={() => handleDeleteAdmin(selectedAdmin._id)}
                              >
                                Delete
                              </button>
                            </div>

                            {permissionEditorOpen && (
                              <div style={styles.permissionsEditor}>
                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Select Permissions</div>
                                <div style={styles.permissionGroups}>
                                  {PERMISSION_GROUPS.map((group) => (
                                    <div key={`edit-group-${group.heading}`} style={styles.permissionGroup}>
                                      <div style={styles.permissionGroupTitle}>{group.heading}</div>
                                      <div style={styles.permissionsList}>
                                        {group.options.map((opt) => (
                                          <label key={opt.key} style={styles.permissionItem}>
                                            <input
                                              type="checkbox"
                                              checked={permissionDraft.includes(opt.key)}
                                              onChange={(e) => {
                                                setPermissionDraft((prev) =>
                                                  e.target.checked
                                                    ? Array.from(new Set([...prev, opt.key]))
                                                    : prev.filter((p) => p !== opt.key)
                                                );
                                              }}
                                            />
                                            <span>{opt.label}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                                  <button
                                    style={styles.actionButton}
                                    disabled={adminLoading}
                                    onClick={() => handleSetPermissions(selectedAdmin, permissionDraft)}
                                  >
                                    Save Permissions
                                  </button>
                                  <button
                                    style={styles.actionButton}
                                    disabled={adminLoading}
                                    onClick={() => setPermissionEditorOpen(false)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside style={styles.sidebar}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={styles.sectionTitle}>{editingId ? "Edit Employee" : "Add Employee"}</h3>
            <form onSubmit={handleSubmit} style={styles.formGridSidebar}>
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={styles.input} />
              <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} />
              <select value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setSelectedDesignation(""); }} style={styles.input}>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              <select value={selectedDesignation} onChange={(e) => setSelectedDesignation(e.target.value)} style={styles.input}>
                <option value="">Select Designation</option>
                {designations.filter((desig) => desig.department?._id === selectedDepartment).map((desig) => (
                  <option key={desig._id} value={desig._id}>{desig.title}</option>
                ))}
              </select>
              <input type="number" placeholder="Salary" value={salary} onChange={(e) => setSalary(e.target.value)} style={styles.input} />
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" style={styles.primaryButton}>{editingId ? "Update" : "Add"}</button>
                {editingId && <button type="button" onClick={resetForm} style={styles.cancelButton}>Cancel</button>}
              </div>
            </form>
          </div>

          <div>
            <h3 style={styles.sectionTitle}>Employee List</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {employees.map((emp) => (
                <div
                  key={emp._id}
                  style={{
                    ...styles.employeeRow,
                    cursor: "pointer",
                    borderColor: selectedEmployeeRowId === emp._id ? "#6f4a99" : "#eee",
                    background: selectedEmployeeRowId === emp._id ? "#f4edff" : "#fff",
                  }}
                  onClick={() => setSelectedEmployeeRowId(selectedEmployeeRowId === emp._id ? null : emp._id)}
                  onDoubleClick={() => navigate(`/employees/${emp._id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{emp.department?.name} • {emp.designation?.title}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{emp.status}</div>
                </div>
              ))}
            </div>

            {selectedEmployeeRowId && (
              <div style={styles.employeeActionPanel}>
                {(() => {
                  const selected = employees.find((e) => e._id === selectedEmployeeRowId);
                  if (!selected) return null;
                  return (
                    <>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>Actions for {selected.name}</div>
                      <div style={styles.actionList}>
                        <button style={styles.viewButton} onClick={() => navigate(`/employees/${selected._id}`)}>View Details</button>
                        <button style={styles.editButton} onClick={() => handleEdit(selected)}>Edit</button>
                        <button style={styles.deleteButton} onClick={() => handleDelete(selected._id)}>Deactivate</button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;

const styles = {
  container: {
    backgroundColor: "#efe9f6",
    padding: "30px",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    gap: "25px",
  },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: "26px", fontWeight: "700" },
  subtitle: { fontSize: "14px", color: "#666" },
  headerActions: { display: "flex", gap: 12, alignItems: "center" },
  searchInput: { padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" },
  searchButton: {
    background: "#f3ecff",
    border: "1px solid #d9c8f6",
    padding: 8,
    borderRadius: 8,
    color: "#3f2a5f",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profileButton: { backgroundColor: "#f3f4f6", border: "none", padding: "8px 12px", borderRadius: 999, cursor: "pointer" },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" },
  mainCol: { display: "flex", flexDirection: "column", gap: 20 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 },
  statCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, display: "flex", gap: 12, alignItems: "center", border: "1px solid #eee" },
  statIcon: { fontSize: 16, backgroundColor: "#f3f4f6", padding: 8, borderRadius: 8, minWidth: 28, textAlign: "center" },
  statNumber: { fontSize: 20, fontWeight: 700 },
  statLabel: { fontSize: 12, color: "#6b7280" },
  card: { backgroundColor: "#faf7ff", padding: "20px", borderRadius: "14px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" },
  sectionTitle: { fontSize: "18px", fontWeight: "600", marginBottom: "15px" },
  subSectionTitle: { margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#374151" },
  adminGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  emptyHint: { color: "#6b7280", fontSize: 13, padding: "8px 0" },
  sidebar: { background: "transparent" },
  formGridSidebar: { display: "grid", gap: 10 },
  input: { padding: "10px", borderRadius: "8px", border: "1px solid #ccc" },
  primaryButton: { padding: "10px 16px", borderRadius: "8px", border: "1px solid #d9c8f6", backgroundColor: "#f3ecff", color: "#3f2a5f", cursor: "pointer" },
  cancelButton: { padding: "10px 16px", borderRadius: "8px", border: "none", backgroundColor: "#777", color: "#fff", cursor: "pointer" },
  editButton: { padding: "6px 10px", borderRadius: "6px", border: "none", backgroundColor: "#2980B9", color: "#fff", cursor: "pointer" },
  deleteButton: { padding: "6px 10px", borderRadius: "6px", border: "none", backgroundColor: "#C0392B", color: "#fff", cursor: "pointer" },
  actionButton: {
    width: 140,
    textAlign: "center",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    cursor: "pointer",
    fontWeight: 600,
  },
  actionButtonDanger: {
    width: 140,
    textAlign: "center",
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "#fee2e2",
    color: "#991b1b",
    cursor: "pointer",
    fontWeight: 600,
  },
  employeeRow: { background: "#fff", padding: 10, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #eee" },
  employeeActionPanel: { marginTop: 10, border: "1px solid #d1d5db", borderRadius: 8, padding: 10, background: "#f9fafb" },
  actionList: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
  permissionsEditor: {
    width: "100%",
    marginTop: 10,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#fff",
  },
  createPermissionsBox: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
  },
  permissionsList: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
  },
  permissionGroups: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  permissionGroup: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 8,
    background: "#fff",
  },
  permissionGroupTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 6,
  },
  permissionItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#374151",
  },
  searchResultsCard: { background: "#fff", padding: 12, borderRadius: 10, border: "1px solid #eee", marginTop: 12 },
  searchResultRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, borderRadius: 8, background: "#fbfbfb" },
  viewButton: { padding: "6px 10px", borderRadius: 8, border: "1px solid #d9c8f6", backgroundColor: "#f3ecff", color: "#3f2a5f", cursor: "pointer" },
  clearSearchButton: { padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd", background: "transparent", cursor: "pointer" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  modalCard: { background: "#fff", padding: 20, borderRadius: 12, width: "90%", maxWidth: 700, boxShadow: "0 6px 24px rgba(0,0,0,0.15)" },
  modalRow: { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  detailsLoading: { padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", color: "#6b7280", background: "#f9fafb" },
};

