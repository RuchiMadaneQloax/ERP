const jwt = require('jsonwebtoken');

// Middleware to verify employee JWT tokens
module.exports = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No token provided' });

    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'employee') return res.status(403).json({ message: 'Forbidden' });

    req.employee = decoded; // { id, role, ... }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
