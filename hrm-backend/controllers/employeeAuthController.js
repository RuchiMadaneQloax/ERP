const Employee = require('../models/Employee');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');

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

    const emp = await Employee.findById(id)
      .select('-password')
      .populate('department', 'name code')
      .populate('designation', 'title level');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    const out = emp.toObject();
    const hasThreeEmbeddings = Array.isArray(emp.faceEmbeddings) && emp.faceEmbeddings.length >= 3;
    out.faceEnrolled = hasThreeEmbeddings;
    delete out.faceEmbedding;
    delete out.faceEmbeddings;
    res.json(out);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.enrollFace = async (req, res) => {
  try {
    const id = req.employee?.id;
    const { image, images } = req.body || {};

    if (!id) return res.status(401).json({ message: 'Unauthorized' });
    const normalizedImages = Array.isArray(images)
      ? images.filter((img) => typeof img === 'string' && img.trim().length > 0)
      : image
      ? [image]
      : [];
    if (normalizedImages.length !== 3) {
      return res.status(400).json({ message: 'Exactly 3 face images are required' });
    }

    const emp = await Employee.findById(id).select('_id status');
    if (!emp || emp.status !== 'active') {
      return res.status(404).json({ message: 'Employee not found or inactive' });
    }

    const faceServiceBase = process.env.FACE_SERVICE_URL || 'http://localhost:8000';
    const response = await axios.post(`${faceServiceBase}/enroll/${id}`, { images: normalizedImages });

    return res.json({
      message: response?.data?.message || 'Face enrolled successfully',
      embeddingsCount: response?.data?.embeddingsCount || normalizedImages.length,
      employeeId: id,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.detail || err?.response?.data?.message || err.message;
    return res.status(status).json({ message });
  }
};
