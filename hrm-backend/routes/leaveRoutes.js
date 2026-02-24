const express = require("express");
const router = express.Router();

const controller = require("../controllers/leaveController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Leave Types
router.post(
  "/types",
  authenticate,
  authorize("hr"),
  controller.createLeaveType
);

router.get(
  "/types",
  authenticate,
  controller.getLeaveTypes
);

// Approve / Reject
router.put(
  "/:id/status",
  authenticate,
  authorize("hr", "superadmin"),
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
