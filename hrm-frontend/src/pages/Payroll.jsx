import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/api";

function Payroll({ token }) {
  const navigate = useNavigate();

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
      const data = await getEmployees(token);
      if (Array.isArray(data.employees)) {
        setEmployees(data.employees);
      }
    };

    loadEmployees();
  }, [token]);

  // =============================
  // FETCH PAYROLL HISTORY
  // =============================
  const fetchPayrollHistory = async (employeeId) => {
    if (!employeeId) return;

    const response = await fetch(
      `http://localhost:5000/api/payroll?employee=${employeeId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
          Authorization: `Bearer ${token}`,
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
    <div style={{ padding: "20px" }}>
      <h2>Payroll Management</h2>

      <button onClick={() => navigate("/")}>
        Back to Dashboard
      </button>

      <hr />

      {/* Employee Selection */}
      <select
        value={selectedEmployee}
        onChange={(e) => setSelectedEmployee(e.target.value)}
      >
        <option value="">Select Employee</option>
        {employees.map((emp) => (
          <option key={emp._id} value={emp._id}>
            {emp.name}
          </option>
        ))}
      </select>

      <br /><br />

      {/* Month Selector */}
      <input
        type="month"
        value={month}
        onChange={(e) => setMonth(e.target.value)}
      />

      <br /><br />

      <button onClick={generatePayroll} disabled={loading}>
        {loading ? "Generating..." : "Generate Payroll"}
      </button>

      <hr />

      {/* Payroll Breakdown */}
      {payrollResult && (
        <div>
          <h3>Payroll Breakdown</h3>
          <p>Base Salary: ₹{payrollResult.baseSalary}</p>
          <p>Present Days: {payrollResult.presentDays}</p>
          <p>Absent Days: {payrollResult.absentDays}</p>
          <p>Half Days: {payrollResult.halfDays}</p>
          <h4>Final Salary: ₹{payrollResult.finalSalary}</h4>
        </div>
      )}

      <hr />

      {/* Payroll History */}
      <h3>Payroll History</h3>

      {payrollHistory.length > 0 ? (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Month</th>
              <th>Final Salary</th>
              <th>Generated At</th>
            </tr>
          </thead>
          <tbody>
            {payrollHistory.map((record) => (
              <tr key={record._id}>
                <td>{record.month}</td>
                <td>₹{record.finalSalary}</td>
                <td>
                  {new Date(record.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No payroll records found.</p>
      )}
    </div>
  );
}

export default Payroll;
