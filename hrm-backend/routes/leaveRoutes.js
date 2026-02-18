const express = require("express");
const router = express.Router();

const controller = require("../controllers/leaveController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Leave Types
router.post(
  "/types",
  authenticate,
  authorize("superadmin"),
  controller.createLeaveType
);

router.get(
  "/types",
  authenticate,
  controller.getLeaveTypes
);

// Apply Leave
router.post(
  "/apply",
  authenticate,
  authorize("hr"),
  controller.applyLeave
);

// Approve / Reject
router.put(
  "/:id/status",
  authenticate,
  authorize("superadmin"),
  controller.updateLeaveStatus
);

// Get All Requests
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr"),
  controller.getLeaveRequests
);

module.exports = router;
