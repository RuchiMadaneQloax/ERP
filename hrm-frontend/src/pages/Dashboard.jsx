import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getDepartments,
  getDesignations,
} from "../services/api";

function Dashboard({ token, setToken }) {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedDesignation, setSelectedDesignation] = useState("");

  // =============================
  // LOAD DATA
  // =============================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const employeeData = await getEmployees(token);
        if (Array.isArray(employeeData.employees)) {
          setEmployees(employeeData.employees);
        }

        const deptData = await getDepartments(token);
        if (Array.isArray(deptData.departments)) {
          setDepartments(deptData.departments);
        }

        const desigData = await getDesignations(token);
        if (Array.isArray(desigData.designations)) {
          setDesignations(desigData.designations);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    if (token) fetchData();
  }, [token]);

  // =============================
  // RESET FORM
  // =============================
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setSalary("");
    setSelectedDepartment("");
    setSelectedDesignation("");
  };

  // =============================
  // SUBMIT EMPLOYEE
  // =============================
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
        const updated = await updateEmployee(
          editingId,
          employeeData,
          token
        );

        setEmployees((prev) =>
          prev.map((emp) =>
            emp._id === editingId ? updated : emp
          )
        );
      } else {
        const created = await addEmployee(employeeData, token);
        setEmployees((prev) => [...prev, created]);
      }

      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  // =============================
  // DELETE (SOFT)
  // =============================
  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id, token);
      setEmployees((prev) =>
        prev.filter((emp) => emp._id !== id)
      );
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  // =============================
  // EDIT
  // =============================
  const handleEdit = (emp) => {
    setEditingId(emp._id);
    setName(emp.name);
    setEmail(emp.email);
    setSalary(emp.salary);

    setSelectedDepartment(emp.department?._id || "");
    setSelectedDesignation(emp.designation?._id || "");
  };

  // =============================
  // LOGOUT
  // =============================
  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>ERP HRMS Dashboard</h2>

      <button onClick={handleLogout}>Logout</button>

      <button
        onClick={() => navigate("/attendance")}
        style={{ marginLeft: "10px" }}
      >
        Go to Attendance
      </button>

      <button
        onClick={() => navigate("/payroll")}
        style={{ marginLeft: "10px" }}
      >
        Go to Payroll
      </button>

      <hr />

      <h3>{editingId ? "Edit Employee" : "Add Employee"}</h3>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br /><br />

        <select
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value);
            setSelectedDesignation("");
          }}
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept._id}>
              {dept.name}
            </option>
          ))}
        </select>

        <br /><br />

        <select
          value={selectedDesignation}
          onChange={(e) => setSelectedDesignation(e.target.value)}
        >
          <option value="">Select Designation</option>
          {designations
            .filter(
              (desig) =>
                desig.department?._id === selectedDepartment
            )
            .map((desig) => (
              <option key={desig._id} value={desig._id}>
                {desig.title} (Level {desig.level})
              </option>
            ))}
        </select>

        <br /><br />

        <input
          type="number"
          placeholder="Salary"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />
        <br /><br />

        <button type="submit">
          {editingId ? "Update Employee" : "Add Employee"}
        </button>

        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            style={{ marginLeft: "10px" }}
          >
            Cancel
          </button>
        )}
      </form>

      <hr />

      <h3>Employee List</h3>

      {employees.length > 0 ? (
        <ul>
          {employees.map((emp) => (
            <li key={emp._id} style={{ marginBottom: "15px" }}>
              <strong>{emp.name}</strong> | {emp.email} | ₹
              {emp.salary}
              <br />
              Department: {emp.department?.name}
              <br />
              Designation: {emp.designation?.title} (Level{" "}
              {emp.designation?.level})
              <br />

              <button
                onClick={() => handleEdit(emp)}
                style={{ marginRight: "5px" }}
              >
                Edit
              </button>

              <button onClick={() => handleDelete(emp._id)}>
                Deactivate
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No employees found.</p>
      )}
    </div>
  );
}

export default Dashboard;
