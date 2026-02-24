const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const { resolveEmployeeScopeMatchValues } = require('../utils/resolveEmployeeScope');
const axios = require("axios"); // ✅ NEW

// =======================================
// MARK ATTENDANCE (MANUAL - UNCHANGED)
// =======================================
exports.markAttendance = async (req, res) => {
  try {
    const { employee, date, status, overtimeHours = 0, isHoliday = false } = req.body;

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
      overtimeHours: Number(overtimeHours || 0),
      isHoliday: Boolean(isHoliday),
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
// MARK ATTENDANCE BY FACE (NEW)
// =======================================
exports.markAttendanceByFace = async (req, res) => {
  try {
    const { image } = req.body; // base64 image

    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    // 🔥 Call Python Face Recognition Service
    const response = await axios.post("http://localhost:8000/recognize", {
      image,
    });

    const { employeeId, confidence } = response.data;

    if (!employeeId) {
      return res.status(404).json({
        message: "Face not recognized",
      });
    }

    const empExists = await Employee.findById(employeeId);
    if (!empExists || empExists.status !== "active") {
      return res.status(400).json({
        message: "Invalid or inactive employee",
      });
    }

    const now = new Date();

// Convert to IST (UTC +5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(now.getTime() + istOffset);

// Set time to midnight
    istDate.setHours(0, 0, 0, 0);

const today = istDate;

    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.create({
  employee: employeeId,
  date: today,
  status: "present",
  overtimeHours: 0,
  isHoliday: false,
  markedBy: "698ee1729468ca080b94f126",
  method: "face",
  checkInTime: new Date(),
});



    const populated = await Attendance.findById(attendance._id)
      .populate("employee", "name employeeId")
      .populate("markedBy", "name email");

    res.status(201).json({
      message: "Attendance marked via face recognition",
      confidence,
      attendance: populated,
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Attendance already marked for today",
      });
    }

    res.status(500).json({
      message: error.message || "Face attendance failed",
    });
  }
};

// =======================================
// GET ATTENDANCE (UNCHANGED)
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
// MONTHLY SUMMARY (UNCHANGED)
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

// =======================================
// GET MY ATTENDANCE (UNCHANGED)
// =======================================
exports.getMyAttendance = async (req, res) => {
  try {
    const employeeMatchValues = await resolveEmployeeScopeMatchValues(req.employee);
    if (!Array.isArray(employeeMatchValues) || employeeMatchValues.length === 0) {
      return res.json([]);
    }

    const { month } = req.query;

    const query = { employee: { $in: employeeMatchValues } };

    if (month) {
      const start = new Date(month);
      const end = new Date(month);
      end.setMonth(end.getMonth() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'name employeeId')
      .populate('markedBy', 'name email')
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
