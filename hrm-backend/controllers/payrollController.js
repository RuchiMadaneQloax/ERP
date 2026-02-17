const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");

// =======================================
// GENERATE PAYROLL
// =======================================
exports.generatePayroll = async (req, res) => {
  try {
    const { employee, month } = req.body;

    if (!employee || !month) {
      return res.status(400).json({
        message: "Employee and month are required",
      });
    }

    const emp = await Employee.findById(employee).populate("designation");

    if (!emp || emp.status !== "active") {
      return res.status(400).json({
        message: "Invalid or inactive employee",
      });
    }

    const baseSalary = emp.designation.baseSalary;

    const start = new Date(month);
    const end = new Date(month);
    end.setMonth(end.getMonth() + 1);

    // Total days in month
    const totalDays = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0
    ).getDate();

    // Attendance records
    const records = await Attendance.find({
      employee,
      date: { $gte: start, $lt: end },
    });

    let present = 0;
    let halfDay = 0;

    records.forEach((r) => {
      if (r.status === "present") present++;
      if (r.status === "half-day") halfDay++;
    });

    // Unmarked days = absent
    const absent = totalDays - present - halfDay;

    const dailyRate = baseSalary / totalDays;

    const finalSalary =
      baseSalary -
      absent * dailyRate -
      halfDay * (dailyRate / 2);

    const payroll = await Payroll.create({
      employee,
      month,
      baseSalary,
      presentDays: present,
      absentDays: absent,
      halfDays: halfDay,
      finalSalary: Math.round(finalSalary),
      generatedBy: req.admin.id,
    });

    const populated = await Payroll.findById(payroll._id)
      .populate("employee", "name employeeId")
      .populate("generatedBy", "name email");

    res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Payroll already generated for this month",
      });
    }

    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET PAYROLL RECORDS
// =======================================
exports.getPayroll = async (req, res) => {
  try {
    const { employee } = req.query;

    const query = {};

    if (employee) query.employee = employee;

    const payroll = await Payroll.find(query)
      .populate("employee", "name employeeId")
      .populate("generatedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
