import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteEmployee,
  getAttendanceByEmployee,
  getDepartments,
  getDesignations,
  getEmployeeById,
  getLeaveRequests,
  updateEmployee,
} from "../services/api";
import AttendanceCalendar from "../components/AttendanceCalendar";
import formatCurrency from "../utils/formatCurrency";

export default function EmployeeDetails({ token }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const effectiveToken = token ?? localStorage.getItem("token");

  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [emp, attendanceData, leaveData, deptData, desigData] = await Promise.all([
          getEmployeeById(id, effectiveToken),
          getAttendanceByEmployee(effectiveToken, id),
          getLeaveRequests(effectiveToken),
          getDepartments(effectiveToken),
          getDesignations(effectiveToken),
        ]);

        if (emp?._id) {
          setEmployee(emp);
          setName(emp.name || "");
          setEmail(emp.email || "");
          setSalary(emp.salary || "");
          setDepartment(emp.department?._id || "");
          setDesignation(emp.designation?._id || "");
        }

        setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        const ownLeaves = Array.isArray(leaveData)
          ? leaveData.filter((l) => String(l?.employee?._id || l?.employee) === String(id))
          : [];
        setLeaves(ownLeaves);
        setDepartments(Array.isArray(deptData?.departments) ? deptData.departments : []);
        setDesignations(Array.isArray(desigData?.designations) ? desigData.designations : []);
      } finally {
        setLoading(false);
      }
    };

    if (id && effectiveToken) load();
  }, [id, effectiveToken]);

  const onSave = async (e) => {
    e.preventDefault();
    if (!department || !designation) {
      alert("Please select department and designation");
      return;
    }
    try {
      setSaving(true);
      const updated = await updateEmployee(
        id,
        { name, email, salary: Number(salary), department, designation },
        effectiveToken
      );
      if (updated?._id) {
        setEmployee(updated);
        alert("Employee updated");
      } else {
        alert(updated?.message || "Could not update employee");
      }
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async () => {
    if (!confirm("Deactivate this employee?")) return;
    const res = await deleteEmployee(id, effectiveToken);
    if (res?.employee?._id || res?.message) {
      alert("Employee deactivated");
      navigate("/");
    } else {
      alert(res?.message || "Could not deactivate");
    }
  };

  if (loading) return <div style={styles.page}>Loading employee details...</div>;
  if (!employee) return <div style={styles.page}>Employee not found.</div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>{employee.name}</h2>
          <p style={styles.subtitle}>
            {employee.employeeId} • {employee.department?.name} • {employee.designation?.title}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.btnSecondary} onClick={() => navigate("/")}>Back</button>
          <button style={styles.btnDanger} onClick={onDeactivate}>Deactivate</button>
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Edit Employee</h3>
          <form onSubmit={onSave} style={styles.form}>
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
            <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <select style={styles.input} value={department} onChange={(e) => { setDepartment(e.target.value); setDesignation(""); }}>
              <option value="">Select Department</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
            <select style={styles.input} value={designation} onChange={(e) => setDesignation(e.target.value)}>
              <option value="">Select Designation</option>
              {designations.filter((d) => d.department?._id === department).map((d) => (
                <option key={d._id} value={d._id}>{d.title}</option>
              ))}
            </select>
            <input style={styles.input} type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Salary" />
            <button disabled={saving} style={styles.btnPrimary} type="submit">{saving ? "Saving..." : "Save Changes"}</button>
          </form>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Employee Summary</h3>
          <div style={styles.summaryItem}><strong>Email:</strong> {employee.email}</div>
          <div style={styles.summaryItem}><strong>Status:</strong> {employee.status}</div>
          <div style={styles.summaryItem}><strong>Salary:</strong> {formatCurrency(employee.salary)}</div>
          <div style={styles.summaryItem}><strong>Joining Date:</strong> {new Date(employee.joiningDate).toLocaleDateString()}</div>
        </div>
      </div>

      <AttendanceCalendar
        title={`${employee.name} - Attendance`}
        attendanceRecords={attendance}
        leaveRequests={leaves}
      />
    </div>
  );
}

const styles = {
  page: { padding: 24, display: "flex", flexDirection: "column", gap: 16, background: "#e1d7ee", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: "6px 0 0 0", color: "#6b7280" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: "#f4eefb", border: "1px solid #ececec", borderRadius: 12, padding: 14 },
  cardTitle: { marginTop: 0, marginBottom: 10, fontSize: 16 },
  form: { display: "grid", gap: 10 },
  input: { padding: "10px 12px", borderRadius: 8, border: "1px solid #d4d4d4" },
  btnPrimary: { padding: "10px 14px", borderRadius: 8, border: "1px solid #d9c8f6", background: "#f3ecff", color: "#3f2a5f", cursor: "pointer" },
  btnSecondary: { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
  btnDanger: { padding: "8px 12px", borderRadius: 8, border: "none", background: "#c0392b", color: "#fff", cursor: "pointer" },
  summaryItem: { fontSize: 14, color: "#374151", marginBottom: 8 },
};


