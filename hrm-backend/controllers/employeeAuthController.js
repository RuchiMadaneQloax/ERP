const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const DEFAULT_EMPLOYEE_PASSWORD = 'ChangeMe123';

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const emp = await Employee.findOne({ email: normalizedEmail, status: 'active' });
    if (!emp) return res.status(401).json({ message: 'Invalid credentials' });

    // Seed default password for older records that don't have a hash yet.
    if (!emp.password) {
      emp.password = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
      await emp.save();
    }

    const match = await bcrypt.compare(password, emp.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: emp._id.toString(), role: 'employee', email: emp.email, employeeId: emp.employeeId, name: emp.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const id = req.employee?.id;
    const { currentPassword, newPassword } = req.body;

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    const emp = await Employee.findById(id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    if (!emp.password) {
      emp.password = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
      await emp.save();
    }

    const isMatch = await bcrypt.compare(currentPassword, emp.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    emp.password = await bcrypt.hash(newPassword, 10);
    await emp.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const id = req.employee?.id;
    if (!id) return res.status(401).json({ message: 'Unauthorized' });

    const emp = await Employee.findById(id).select('-password');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
