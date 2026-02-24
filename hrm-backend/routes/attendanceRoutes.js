const express = require("express");
const router = express.Router();

const controller = require("../controllers/attendanceController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// =======================================
// MANUAL ATTENDANCE (UNCHANGED)
// =======================================
router.post(
  "/",
  authenticate,
  authorize("superadmin", "hr"),
  controller.markAttendance
);

// =======================================
// FACE ATTENDANCE (NEW)
// =======================================
// This route is for browser kiosk face recognition
// You can optionally protect it with a secret key middleware later
router.post(
  "/face",
  controller.markAttendanceByFace
);

// =======================================
// GET ATTENDANCE (UNCHANGED)
// =======================================
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getAttendance
);

// =======================================
// MONTHLY SUMMARY (UNCHANGED)
// =======================================
router.get(
  "/summary",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getMonthlySummary
);

module.exports = router;
