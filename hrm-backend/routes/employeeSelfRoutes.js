const express = require('express');
const router = express.Router();
const employeeAuth = require('../middleware/employeeAuth');
const leaveController = require('../controllers/leaveController');
const payrollController = require('../controllers/payrollController');
const attendanceController = require('../controllers/attendanceController');

// Employee self-service endpoints
router.post('/leaves/apply', employeeAuth, leaveController.applyMyLeave);
router.get('/leaves', employeeAuth, leaveController.getMyLeaves);
router.get('/payrolls', employeeAuth, payrollController.getMyPayrolls);
router.get('/attendance', employeeAuth, attendanceController.getMyAttendance);

module.exports = router;
