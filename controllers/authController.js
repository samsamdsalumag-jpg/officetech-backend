// List all pending admins (primary admin only)
exports.listPendingAdmins = async (req, res, next) => {
  try {
    // Only primary admin can view pending admins
    const currentAdmin = await Admin.findById(req.admin._id);
    if (!currentAdmin || !currentAdmin.isPrimary) {
      return res.status(403).json({ message: 'Only the primary admin can view pending accounts.' });
    }
    const pendingAdmins = await Admin.find({ isApproved: false, isPrimary: false }).select('-password');
    res.json({ pendingAdmins });
  } catch (err) {
    next(err);
  }
};
// Approve a pending admin (primary admin only)
exports.approveAdmin = async (req, res, next) => {
  try {
    // Only primary admin can approve
    const currentAdmin = await Admin.findById(req.admin._id);
    if (!currentAdmin || !currentAdmin.isPrimary) {
      return res.status(403).json({ message: 'Only the primary admin can approve accounts.' });
    }
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    if (admin.isApproved) {
      return res.status(400).json({ message: 'Admin is already approved' });
    }
    admin.isApproved = true;
    await admin.save();
    res.json({ message: 'Admin approved successfully', admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      isApproved: admin.isApproved,
    }});
  } catch (err) {
    next(err);
  }
};
// Register new admin (admin only)
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const { name, email, password, avatar } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      avatar: avatar || null,
      isApproved: false,
      isPrimary: false,
    });

    res.status(201).json({
      message: 'Admin registered successfully, pending approval by primary admin.',
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        avatar: newAdmin.avatar,
        isApproved: newAdmin.isApproved,
      }
    });
  } catch (err) {
    next(err);
  }
};
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const Admin = require('../models/Admin');

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!admin.isApproved) {
      return res.status(403).json({ message: 'Account not approved. Please contact the primary admin.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        avatar: admin.avatar,
        isPrimary: admin.isPrimary,
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({
    id: req.admin._id,
    name: req.admin.name,
    email: req.admin.email,
    avatar: req.admin.avatar,
    isPrimary: req.admin.isPrimary,
  });
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      { name, avatar },
      { new: true }
    ).select('-password');
    res.json(admin);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);
    
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    admin.password = await bcrypt.hash(newPassword, 12);
    await admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// List all admins (primary admin only)
exports.listAllAdmins = async (req, res, next) => {
  try {
    const currentAdmin = await Admin.findById(req.admin._id);
    if (!currentAdmin || !currentAdmin.isPrimary) {
      return res.status(403).json({ message: 'Only the primary admin can view all admins.' });
    }
    const admins = await Admin.find().select('-password');
    res.json({ admins });
  } catch (err) {
    next(err);
  }
};

// Delete an admin (primary admin only)
exports.deleteAdmin = async (req, res, next) => {
  try {
    const currentAdmin = await Admin.findById(req.admin._id);
    if (!currentAdmin || !currentAdmin.isPrimary) {
      return res.status(403).json({ message: 'Only the primary admin can delete admins.' });
    }
    
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    if (admin.isPrimary) {
      return res.status(400).json({ message: 'Cannot delete the primary admin.' });
    }
    
    await Admin.findByIdAndDelete(req.params.id);
    res.json({ message: 'Admin deleted successfully' });
  } catch (err) {
    next(err);
  }
};
