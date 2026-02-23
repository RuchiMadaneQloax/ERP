const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Designation = require("../models/Designation");
const bcrypt = require("bcryptjs");

const DEFAULT_EMPLOYEE_PASSWORD = "ChangeMe123";

// =======================================
// CREATE EMPLOYEE
// =======================================
exports.createEmployee = async (req, res) => {
  try {
    const { name, email, department, designation, salary } = req.body;

    // Validate department exists
    const deptExists = await Department.findById(department);
    if (!deptExists || deptExists.status !== "active") {
      return res.status(400).json({ message: "Invalid or inactive department" });
    }

    // Validate designation exists
    const designationExists = await Designation.findById(designation);
    if (!designationExists || designationExists.status !== "active") {
      return res.status(400).json({ message: "Invalid or inactive designation" });
    }

    // Auto-generate employeeId
    const count = await Employee.countDocuments();
    const employeeId = `EMP-${String(count + 1).padStart(4, "0")}`;
    const hashedDefaultPassword = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);

    const employee = await Employee.create({
      employeeId,
      name,
      email,
      password: hashedDefaultPassword,
      department,
      designation,
      salary,
    });

    // initialize leave balances from active leave types
    try {
      const leaveTypes = await require('../models/LeaveType').find({ isActive: true });
      if (Array.isArray(leaveTypes) && leaveTypes.length > 0) {
        employee.leaveBalances = leaveTypes.map((lt) => ({ leaveType: lt._id, allocated: lt.maxDaysPerYear || 0, used: 0 }));
        await employee.save();
      }
    } catch (err) {
      // don't block employee creation if leave types lookup fails
      console.warn('Could not initialize leave balances:', err.message);
    }

    const populatedEmployee = await Employee.findById(employee._id)
      .populate("department", "name")
      .populate("designation", "title baseSalary");

    res.status(201).json(populatedEmployee);
    // audit: employee created
    try {
      const Audit = require('../models/Audit');
      await Audit.create({ admin: req.admin?.id, action: 'create_employee', details: { employeeId: employee._id, name: employee.name } });
    } catch (err) {
      // ignore
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET EMPLOYEES (Search + Pagination)
// =======================================
exports.getEmployees = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const query = {
      name: { $regex: search, $options: "i" },
    };

    const employees = await Employee.find(query)
      .populate("department", "name")
      .populate("designation", "title baseSalary")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Employee.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      employees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// UPDATE EMPLOYEE
// =======================================
exports.updateEmployee = async (req, res) => {
  try {
    const { department, designation } = req.body;

    // Validate department if updated
    if (department) {
      const deptExists = await Department.findById(department);
      if (!deptExists || deptExists.status !== "active") {
        return res.status(400).json({ message: "Invalid or inactive department" });
      }
    }

    // Validate designation if updated
    if (designation) {
      const designationExists = await Designation.findById(designation);
      if (!designationExists || designationExists.status !== "active") {
        return res.status(400).json({ message: "Invalid or inactive designation" });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate("department", "name")
      .populate("designation", "title baseSalary");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// SOFT DELETE (Deactivate)
// =======================================
exports.deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ message: "Employee deactivated successfully", employee });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// ADJUST LEAVE BALANCE (Superadmin)
// body: { leaveTypeId, deltaAllocated, deltaUsed }
// =======================================
exports.adjustLeaveBalance = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveTypeId, deltaAllocated = 0, deltaUsed = 0 } = req.body;

    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    let idx = employee.leaveBalances.findIndex(lb => lb.leaveType && lb.leaveType.toString() === leaveTypeId);
    if (idx === -1) {
      // create new entry
      employee.leaveBalances.push({ leaveType: leaveTypeId, allocated: deltaAllocated, used: deltaUsed });
    } else {
      employee.leaveBalances[idx].allocated = (employee.leaveBalances[idx].allocated || 0) + Number(deltaAllocated);
      employee.leaveBalances[idx].used = (employee.leaveBalances[idx].used || 0) + Number(deltaUsed);
    }

    await employee.save();

    const populated = await Employee.findById(id).populate('department').populate('designation');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
