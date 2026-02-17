const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");
const { authenticate, authorize } = require("../middleware/authMiddleware");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.put(
  "/change-password",
  authenticate,
  controller.changePassword
);
router.get(
  "/admins",
  authenticate,
  authorize("superadmin"),
  controller.getAdmins
);
router.delete(
  "/admins/:id",
  authenticate,
  authorize("superadmin"),
  controller.deleteAdmin
);


module.exports = router;
