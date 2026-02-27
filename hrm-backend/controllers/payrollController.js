const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Audit = require('../models/Audit');
const { resolveEmployeeScopeMatchValues } = require('../utils/resolveEmployeeScope');
const CompensationPolicy = require("../models/CompensationPolicy");

function parsePayrollMonth(monthInput) {
  const raw = String(monthInput || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || month < 1 || month > 12) return null;

  const monthKey = `${String(year)}-${String(month).padStart(2, "0")}`;
  const start = new Date(`${monthKey}-01T00:00:00.000Z`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = new Date(`${String(nextYear)}-${String(nextMonth).padStart(2, "0")}-01T00:00:00.000Z`);
  return { monthKey, start, end };
}

// =======================================
// GENERATE PAYROLL
// =======================================
exports.generatePayroll = async (req, res) => {
  try {
    const {
      employee,
      month,
      overtimeHours = 0,
      overtimeRate = null,
      holidayPay = 0,
      adjustments = [],
      baseSalary: overrideBaseSalary,
    } = req.body;

    if (!employee || !month) {
      return res.status(400).json({
        message: "Employee and month are required",
      });
    }
    const parsedMonth = parsePayrollMonth(month);
    if (!parsedMonth) {
      return res.status(400).json({ message: "Invalid month format. Use YYYY-MM." });
    }

    const emp = await Employee.findById(employee).populate("designation");

    if (!emp || emp.status !== "active") {
      return res.status(400).json({
        message: "Invalid or inactive employee",
      });
    }

    const overrideParsed = Number(overrideBaseSalary);
    const hasOverride = overrideBaseSalary !== null && overrideBaseSalary !== undefined && Number.isFinite(overrideParsed);
    const designationSalary = Number(emp?.designation?.baseSalary || 0);
    const employeeSalary = Number(emp?.salary || 0);
    const baseSalary = hasOverride ? overrideParsed : (designationSalary > 0 ? designationSalary : employeeSalary);
    if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
      return res.status(400).json({ message: "Employee base salary is not configured" });
    }

    const { monthKey, start, end } = parsedMonth;

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

    // Overtime tracked in attendance is included by default.
    const trackedOvertimeHours = records.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0);
    const additionalOvertimeHours = Number(overtimeHours || 0);
    const effectiveOvertimeHours = Math.max(0, trackedOvertimeHours + additionalOvertimeHours);

    // compute overtime pay
    const computedHourly = baseSalary / totalDays / 8; // assume 8 hours/day
    const usedOvertimeRate = overtimeRate && Number(overtimeRate) > 0 ? Number(overtimeRate) : computedHourly * 1.5;
    const overtimePay = effectiveOvertimeHours * usedOvertimeRate;

    // adjustments array: [{label, amount}, ...]
    const adjustmentsTotal = Array.isArray(adjustments)
      ? adjustments.reduce((s, a) => s + (Number(a.amount) || 0), 0)
      : 0;

    const grossSalary = Math.round(
      baseSalary -
        absent * dailyRate -
        halfDay * (dailyRate / 2) +
        (overtimePay || 0) +
        (Number(holidayPay) || 0) +
        adjustmentsTotal
    );

    const policy = await CompensationPolicy.findOne({ key: "global" });
    const taxRatePercent = Math.max(0, Number(policy?.taxRatePercent || 0));
    const taxAmount = Math.round((grossSalary * taxRatePercent) / 100);
    const massDeductions = Array.isArray(policy?.deductions)
      ? policy.deductions.map((d) => {
          const safeValue = Math.max(0, Number(d?.value || 0));
          const amount =
            d?.type === "fixed"
              ? safeValue
              : Math.round((grossSalary * safeValue) / 100);
          return {
            label: d?.label || "Deduction",
            type: d?.type === "fixed" ? "fixed" : "percent",
            value: safeValue,
            amount,
          };
        })
      : [];

    const totalMassDeductions = massDeductions.reduce((s, d) => s + (Number(d.amount) || 0), 0);
    const totalDeductions = taxAmount + totalMassDeductions;
    const finalSalary = Math.round(grossSalary - totalDeductions);

    const payroll = await Payroll.create({
      employee,
      month: monthKey,
      baseSalary,
      dynamicBaseSalary: hasOverride ? overrideParsed : undefined,
      presentDays: present,
      absentDays: absent,
      halfDays: halfDay,
      overtimeHours: Number(effectiveOvertimeHours || 0),
      overtimeRate: Number(usedOvertimeRate || 0),
      overtimePay: Math.round(overtimePay || 0),
      holidayPay: Number(holidayPay || 0),
      grossSalary: Number(grossSalary || 0),
      taxRatePercent,
      taxAmount,
      massDeductions,
      totalDeductions,
      adjustments: Array.isArray(adjustments) ? adjustments : [],
      finalSalary: finalSalary,
      generatedBy: req.admin.id,
    });

    const populated = await Payroll.findById(payroll._id)
      .populate("employee", "name employeeId")
      .populate("generatedBy", "name email");

    // audit log
    try {
      await Audit.create({
        admin: req.admin.id,
        action: 'generate_payroll',
        details: {
          payrollId: payroll._id,
          employee: employee,
          month: monthKey,
          trackedOvertimeHours: Number(trackedOvertimeHours || 0),
          additionalOvertimeHours: Number(additionalOvertimeHours || 0),
          overtimeHours: Number(effectiveOvertimeHours || 0),
          overtimePay: Math.round(overtimePay || 0),
          grossSalary: Number(grossSalary || 0),
          taxRatePercent,
          taxAmount,
          totalMassDeductions,
          totalDeductions,
          holidayPay: Number(holidayPay || 0),
          adjustments: Array.isArray(adjustments) ? adjustments : [],
        },
      });
    } catch (err) {
      console.warn('Failed to write audit for payroll generation:', err.message);
    }

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

// =======================================
// GET MY PAYROLLS (Employee)
// =======================================
exports.getMyPayrolls = async (req, res) => {
  try {
    const employeeMatchValues = await resolveEmployeeScopeMatchValues(req.employee);
    if (!Array.isArray(employeeMatchValues) || employeeMatchValues.length === 0) {
      return res.json([]);
    }
    const { month } = req.query;
    const query = { employee: { $in: employeeMatchValues } };

    if (month) {
      const parsedMonth = parsePayrollMonth(month);
      if (!parsedMonth) return res.status(400).json({ message: "Invalid month format. Use YYYY-MM." });
      query.month = parsedMonth.monthKey;
    }

    const payroll = await Payroll.find(query)
      .populate('employee', 'name employeeId')
      .sort({ month: -1 });

    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
