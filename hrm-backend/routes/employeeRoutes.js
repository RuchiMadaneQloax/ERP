const express = require("express");
const router = express.Router();

const controller = require("../controllers/employeeController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Only superadmin and hr can create employee
router.post(
  "/",
  authenticate,
  authorize("superadmin", "hr"),
  controller.createEmployee
);

// All roles can view employees
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getEmployees
);

// Only superadmin and hr can update
router.put(
  "/:id",
  authenticate,
  authorize("superadmin", "hr"),
  controller.updateEmployee
);

// Only superadmin can deactivate
router.delete(
  "/:id",
  authenticate,
  authorize("superadmin"),
  controller.deleteEmployee
);

module.exports = router;
