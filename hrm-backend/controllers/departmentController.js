const Department = require("../models/Department");
const Employee = require("../models/Employee");

// =======================================
// CREATE DEPARTMENT
// =======================================
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const existing = await Department.findOne({
      $or: [{ name }, { code }],
    });

    if (existing) {
      return res.status(400).json({
        message: "Department with same name or code already exists",
      });
    }

    const department = await Department.create({
      name,
      code,
      description,
    });

    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// =======================================
// GET DEPARTMENTS (Search + Pagination)
// =======================================
exports.getDepartments = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const query = {
      name: { $regex: search, $options: "i" },
    };

    const departments = await Department.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Department.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      departments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// UPDATE DEPARTMENT
// =======================================
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// SOFT DELETE (Deactivate)
// =======================================
exports.deleteDepartment = async (req, res) => {
  try {
    // Prevent deletion if employees exist
    const employees = await Employee.find({ department: req.params.id });

    if (employees.length > 0) {
      return res.status(400).json({
        message: "Cannot deactivate department with assigned employees",
      });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json({ message: "Department deactivated", department });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
