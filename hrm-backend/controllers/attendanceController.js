const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const axios = require("axios");
const { resolveEmployeeScopeMatchValues } = require("../utils/resolveEmployeeScope");

function getISTDateStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}

function getISTMonthRange(monthInput) {
  const raw = String(monthInput || "");
  const [yearPart, monthPart] = raw.split("-").map((v) => Number(v));
  if (!yearPart || !monthPart || monthPart < 1 || monthPart > 12) return null;

  const start = new Date(`${String(yearPart)}-${String(monthPart).padStart(2, "0")}-01T00:00:00+05:30`);
  const nextYear = monthPart === 12 ? yearPart + 1 : yearPart;
  const nextMonth = monthPart === 12 ? 1 : monthPart + 1;
  const end = new Date(`${String(nextYear)}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+05:30`);
  return { start, end };
}

function getISTDateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

function isISTWeekend(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(d);
  return weekday === "Sat" || weekday === "Sun";
}

function getCurrentISTMonthString(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) return "";
  return `${year}-${month}`;
}

async function backfillMissingAttendance({ employeeIds = [], range, markedBy = null }) {
  if (!Array.isArray(employeeIds) || employeeIds.length === 0 || !range?.start || !range?.end) return;

  const todayStart = getISTDateStart();
  const startTime = range.start.getTime();
  const endTime = Math.min(range.end.getTime(), todayStart.getTime());
  if (startTime >= endTime) return;

  const start = new Date(startTime);
  const end = new Date(endTime);

  const existing = await Attendance.find({
    employee: { $in: employeeIds },
    date: { $gte: start, $lt: end },
  }).select("employee date");

  const existingKeys = new Set(
    existing.map((row) => `${String(row.employee)}|${getISTDateKey(row.date)}`)
  );

  const toInsert = [];
  for (const employeeId of employeeIds) {
    for (let cursor = new Date(start); cursor < end; cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000)) {
      const dateKey = getISTDateKey(cursor);
      if (!dateKey) continue;
      const rowKey = `${String(employeeId)}|${dateKey}`;
      if (existingKeys.has(rowKey)) continue;

      const dayStart = new Date(`${dateKey}T00:00:00+05:30`);
      const weekend = isISTWeekend(dayStart);
      toInsert.push({
        employee: employeeId,
        date: dayStart,
        status: weekend ? "holiday" : "absent",
        isHoliday: weekend,
        overtimeHours: 0,
        markedBy,
        method: "system",
      });
    }
  }

  if (toInsert.length === 0) return;
  try {
    await Attendance.insertMany(toInsert, { ordered: false });
  } catch (error) {
    if (error?.code !== 11000) throw error;
  }
}

exports.markAttendance = async (req, res) => {
  try {
    const { employee, date, status, overtimeHours = 0, isHoliday = false } = req.body;

    const empExists = await Employee.findById(employee);
    if (!empExists || empExists.status !== "active") {
      return res.status(400).json({ message: "Invalid or inactive employee" });
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
        message: "Attendance already marked for this employee on this date",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.markAttendanceByFace = async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: "Image is required" });

    const response = await axios.post("http://localhost:8000/recognize", { image });
    const { employeeId, confidence, validationError } = response.data;

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    if (!employeeId) {
      return res.status(404).json({ message: "Face not recognized" });
    }

    const empExists = await Employee.findById(employeeId);
    if (!empExists || empExists.status !== "active") {
      return res.status(400).json({ message: "Invalid or inactive employee" });
    }

    const today = getISTDateStart();

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
      return res.status(400).json({ message: "Attendance already marked for today" });
    }
    res.status(500).json({ message: error.message || "Face attendance failed" });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employee, month } = req.query;
    const query = {};
    let monthRange = null;

    if (employee) query.employee = employee;

    if (month) {
      monthRange = getISTMonthRange(month);
      if (monthRange) query.date = { $gte: monthRange.start, $lt: monthRange.end };
    } else {
      monthRange = getISTMonthRange(getCurrentISTMonthString());
    }

    try {
      let employeeIds = [];
      if (employee) {
        employeeIds = [employee];
      } else {
        const employees = await Employee.find({ status: "active" }).select("_id");
        employeeIds = employees.map((e) => e._id);
      }
      await backfillMissingAttendance({
        employeeIds,
        range: monthRange,
        markedBy: req.admin?.id || null,
      });
    } catch (backfillError) {
      console.warn("Attendance backfill skipped:", backfillError.message);
    }

    const attendance = await Attendance.find(query)
      .populate("employee", "name employeeId")
      .populate("markedBy", "name email");

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const { employee, month } = req.query;
    if (!employee || !month) {
      return res.status(400).json({ message: "Employee and month are required" });
    }

    const range = getISTMonthRange(month);
    if (!range) return res.status(400).json({ message: "Invalid month format" });

    const records = await Attendance.find({
      employee,
      date: { $gte: range.start, $lt: range.end },
    });

    const summary = { present: 0, absent: 0, halfDay: 0 };
    records.forEach((r) => {
      if (r.status === "present") summary.present++;
      if (r.status === "absent") summary.absent++;
      if (r.status === "half-day") summary.halfDay++;
    });

    res.json({ totalDays: records.length, ...summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const employeeMatchValues = await resolveEmployeeScopeMatchValues(req.employee);
    if (!Array.isArray(employeeMatchValues) || employeeMatchValues.length === 0) {
      return res.json([]);
    }

    const { month } = req.query;
    const query = { employee: { $in: employeeMatchValues } };
    let monthRange = null;

    if (month) {
      monthRange = getISTMonthRange(month);
      if (monthRange) query.date = { $gte: monthRange.start, $lt: monthRange.end };
    } else {
      monthRange = getISTMonthRange(getCurrentISTMonthString());
    }

    try {
      await backfillMissingAttendance({
        employeeIds: employeeMatchValues,
        range: monthRange,
        markedBy: null,
      });
    } catch (backfillError) {
      console.warn("My attendance backfill skipped:", backfillError.message);
    }

    const attendance = await Attendance.find(query)
      .populate("employee", "name employeeId")
      .populate("markedBy", "name email")
      .sort({ date: -1 });

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
