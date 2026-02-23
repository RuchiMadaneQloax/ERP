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

    if (password !== DEFAULT_EMPLOYEE_PASSWORD) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Keep stored passwords in sync with the shared employee password.
    const hasDefaultPassword = emp.password
      ? await bcrypt.compare(DEFAULT_EMPLOYEE_PASSWORD, emp.password)
      : false;

    if (!hasDefaultPassword) {
      emp.password = await bcrypt.hash(DEFAULT_EMPLOYEE_PASSWORD, 10);
      await emp.save();
    }

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
