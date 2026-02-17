const express = require("express");
const router = express.Router();

const controller = require("../controllers/departmentController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Create department (superadmin only)
router.post(
  "/",
  authenticate,
  authorize("superadmin"),
  controller.createDepartment
);

// Get departments (all roles)
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getDepartments
);

// Update department (superadmin only)
router.put(
  "/:id",
  authenticate,
  authorize("superadmin"),
  controller.updateDepartment
);

// Deactivate department (superadmin only)
router.delete(
  "/:id",
  authenticate,
  authorize("superadmin"),
  controller.deleteDepartment
);

module.exports = router;
