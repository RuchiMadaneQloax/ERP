const Employee = require("../models/Employee");
const Department = require("../models/Department");
const Designation = require("../models/Designation");

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

    const employee = await Employee.create({
      employeeId,
      name,
      email,
      department,
      designation,
      salary,
    });

    const populatedEmployee = await Employee.findById(employee._id)
      .populate("department", "name")
      .populate("designation", "title baseSalary");

    res.status(201).json(populatedEmployee);
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
