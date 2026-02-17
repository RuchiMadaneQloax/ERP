const express = require("express");
const router = express.Router();

const controller = require("../controllers/attendanceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// HR and superadmin can mark attendance
router.post(
  "/",
  authenticate,
  authorize("superadmin", "hr"),
  controller.markAttendance
);

// All roles can view attendance
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getAttendance
);

// Monthly summary
router.get(
  "/summary",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getMonthlySummary
);

module.exports = router;
