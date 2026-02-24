const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register Admin
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, permissions = [] } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: role || "superadmin",
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    res.status(201).json({ message: "Admin registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Login Admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });

    if (!admin || !admin.isActive) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// CHANGE PASSWORD
// =======================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: "Password changed successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET ALL ADMINS (Superadmin Only)
// =======================================
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");

    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET ADMIN BY ID (Superadmin Only)
// =======================================
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// UPDATE ADMIN (Superadmin Only)
// =======================================
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, permissions } = req.body;

    const admin = await Admin.findById(id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Prevent deactivating yourself
    if (admin._id.toString() === req.admin.id && isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    if (role !== undefined) admin.role = role;
    if (typeof isActive === "boolean") admin.isActive = isActive;
    if (permissions !== undefined) admin.permissions = Array.isArray(permissions) ? permissions : [];

    await admin.save();

    const safeAdmin = await Admin.findById(id).select("-password");
    res.json(safeAdmin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET PROFILE - returns current admin's basic info
// =======================================
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'User not found' });
    res.json({ id: admin._id, name: admin.name, email: admin.email, role: admin.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// DELETE ADMIN (Superadmin Only)
// =======================================
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Prevent deleting yourself
    if (admin._id.toString() === req.admin.id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    await admin.deleteOne();

    res.json({ message: "Admin deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
