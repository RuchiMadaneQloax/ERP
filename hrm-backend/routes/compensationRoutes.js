const express = require("express");
const router = express.Router();

const controller = require("../controllers/compensationController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.get(
  "/policy",
  authenticate,
  authorize("superadmin", "hr"),
  controller.getPolicy
);

router.put(
  "/policy",
  authenticate,
  authorize("superadmin", "hr"),
  controller.updatePolicy
);

router.post(
  "/assign",
  authenticate,
  authorize("superadmin", "hr"),
  controller.assignSalaries
);

router.post(
  "/revise",
  authenticate,
  authorize("superadmin", "hr"),
  controller.reviseSalaries
);

module.exports = router;
