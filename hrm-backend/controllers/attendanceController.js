const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// =======================================
// MARK ATTENDANCE
// =======================================
exports.markAttendance = async (req, res) => {
  try {
    const { employee, date, status } = req.body;

    // Validate employee exists & active
    const empExists = await Employee.findById(employee);
    if (!empExists || empExists.status !== "active") {
      return res.status(400).json({
        message: "Invalid or inactive employee",
      });
    }

    const attendance = await Attendance.create({
      employee,
      date,
      status,
      markedBy: req.admin.id,
    });

    const populated = await Attendance.findById(attendance._id)
      .populate("employee", "name employeeId")
      .populate("markedBy", "name email");

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "Attendance already marked for this employee on this date",
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET ATTENDANCE
// =======================================
exports.getAttendance = async (req, res) => {
  try {
    const { employee, month } = req.query;

    const query = {};

    if (employee) {
      query.employee = employee;
    }

    if (month) {
      const start = new Date(month);
      const end = new Date(month);
      end.setMonth(end.getMonth() + 1);

      query.date = { $gte: start, $lt: end };
    }

    const attendance = await Attendance.find(query)
      .populate("employee", "name employeeId")
      .populate("markedBy", "name email");

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// MONTHLY SUMMARY
// =======================================
exports.getMonthlySummary = async (req, res) => {
  try {
    const { employee, month } = req.query;

    if (!employee || !month) {
      return res.status(400).json({
        message: "Employee and month are required",
      });
    }

    const start = new Date(month);
    const end = new Date(month);
    end.setMonth(end.getMonth() + 1);

    const records = await Attendance.find({
      employee,
      date: { $gte: start, $lt: end },
    });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
    };

    records.forEach((r) => {
      if (r.status === "present") summary.present++;
      if (r.status === "absent") summary.absent++;
      if (r.status === "half-day") summary.halfDay++;
    });

    res.json({
      totalDays: records.length,
      ...summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
