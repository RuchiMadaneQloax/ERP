const Designation = require("../models/Designation");
const Department = require("../models/Department");
const Employee = require("../models/Employee");

// =======================================
// CREATE DESIGNATION
// =======================================
exports.createDesignation = async (req, res) => {
  try {
    const { title, department, baseSalary, level } = req.body;

    // Validate department exists & active
    const deptExists = await Department.findById(department);
    if (!deptExists || deptExists.status !== "active") {
      return res.status(400).json({
        message: "Invalid or inactive department",
      });
    }

    // Prevent duplicate designation title in same department
    const existing = await Designation.findOne({
      title,
      department,
      status: "active",
    });

    if (existing) {
      return res.status(400).json({
        message: "Designation already exists in this department",
      });
    }

    const designation = await Designation.create({
      title,
      department,
      baseSalary,
      level,
    });

    const populatedDesignation = await Designation.findById(
      designation._id
    ).populate("department", "name code");

    res.status(201).json(populatedDesignation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET DESIGNATIONS (Search + Pagination)
// =======================================
exports.getDesignations = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;

    const query = {
      title: { $regex: search, $options: "i" },
      status: "active",
    };

    const designations = await Designation.find(query)
      .populate("department", "name code")
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Designation.countDocuments(query);

    res.json({
      total,
      page: Number(page),
      designations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// UPDATE DESIGNATION
// =======================================
exports.updateDesignation = async (req, res) => {
  try {
    const { department, title } = req.body;

    // Validate department if updated
    if (department) {
      const deptExists = await Department.findById(department);
      if (!deptExists || deptExists.status !== "active") {
        return res.status(400).json({
          message: "Invalid or inactive department",
        });
      }
    }

    // Prevent duplicate title in same department (if title updated)
    if (title) {
      const existing = await Designation.findOne({
        _id: { $ne: req.params.id },
        title,
        department: department,
        status: "active",
      });

      if (existing) {
        return res.status(400).json({
          message: "Another designation with same title exists in department",
        });
      }
    }

    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate("department", "name code");

    if (!designation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// SOFT DELETE DESIGNATION
// =======================================
exports.deleteDesignation = async (req, res) => {
  try {
    // Prevent deletion if employees assigned
    const employees = await Employee.find({
      designation: req.params.id,
      status: "active",
    });

    if (employees.length > 0) {
      return res.status(400).json({
        message:
          "Cannot deactivate designation assigned to active employees",
      });
    }

    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );

    if (!designation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    res.json({
      message: "Designation deactivated successfully",
      designation,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
