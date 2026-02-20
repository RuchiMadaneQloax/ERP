const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const emp = await Employee.findOne({ email: email.toLowerCase() });
    if (!emp || !emp.password) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, emp.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: emp._id.toString(), role: 'employee' }, process.env.JWT_SECRET, { expiresIn: '1d' });
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
