const express = require("express");
const router = express.Router();

const controller = require("../controllers/designationController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

// Create designation (superadmin only)
router.post(
  "/",
  authenticate,
  authorize("superadmin"),
  controller.createDesignation
);

// Get designations (all roles)
router.get(
  "/",
  authenticate,
  authorize("superadmin", "hr", "manager"),
  controller.getDesignations
);

// Update designation (superadmin only)
router.put(
  "/:id",
  authenticate,
  authorize("superadmin"),
  controller.updateDesignation
);

// Deactivate designation (superadmin only)
router.delete(
  "/:id",
  authenticate,
  authorize("superadmin"),
  controller.deleteDesignation
);

module.exports = router;
