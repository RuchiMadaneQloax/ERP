const express = require("express");
const router = express.Router();

const controller = require("../controllers/payrollController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Only superadmin & HR can generate payroll
router.post(
  "/",
  authenticate,
  authorize("superadmin", "hr"),
  controller.generatePayroll
);

// View payroll records
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getPayroll
);

module.exports = router;
