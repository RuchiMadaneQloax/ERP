const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeeAuthController');
const employeeAuth = require('../middleware/employeeAuth');

router.post('/login', controller.login);
router.get('/me', employeeAuth, controller.me);
router.put('/change-password', employeeAuth, controller.changePassword);

module.exports = router;
