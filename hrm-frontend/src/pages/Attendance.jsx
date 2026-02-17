import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEmployees } from "../services/api";

function Attendance({ token }) {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("present");

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // =============================
  // LOAD EMPLOYEES
  // =============================
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await getEmployees(token);
        if (Array.isArray(data.employees)) {
          setEmployees(data.employees);
        }
      } catch (error) {
        console.error("Error loading employees:", error);
      }
    };

    loadEmployees();
  }, [token]);

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
            Authorization: `Bearer ${token}`,
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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            employee: selectedEmployee,
            date,
            status,
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
    <div style={{ padding: "20px" }}>
      <h2>Attendance Management</h2>

      {/* Navigation */}
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

      {/* Date Picker */}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <br /><br />

      {/* Status Selector */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="present">Present</option>
        <option value="absent">Absent</option>
        <option value="half-day">Half Day</option>
      </select>

      <br /><br />

      {/* Submit Button */}
      <button onClick={markAttendance} disabled={loading}>
        {loading ? "Marking..." : "Mark Attendance"}
      </button>

      <hr />

      {/* Attendance History */}
      <h3>Attendance History</h3>

      {attendanceRecords.length > 0 ? (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Marked By</th>
            </tr>
          </thead>
          <tbody>
            {attendanceRecords.map((record) => (
              <tr key={record._id}>
                <td>
                  {new Date(record.date).toLocaleDateString()}
                </td>
                <td>{record.status}</td>
                <td>{record.markedBy?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No attendance records found.</p>
      )}
    </div>
  );
}

export default Attendance;
