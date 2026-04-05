
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
// List all pending admins (primary admin only)
router.get('/pending', auth, authController.listPendingAdmins);
// List all admins (primary admin only)
router.get('/all', auth, authController.listAllAdmins);
// Approve a pending admin (primary admin only)
router.put('/approve/:id', auth, authController.approveAdmin);
// Delete an admin (primary admin only)
router.delete('/:id', auth, authController.deleteAdmin);
// Register new admin (public - will be pending until approved)
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], authController.login);

router.get('/me', auth, authController.getMe);
router.put('/profile', auth, authController.updateProfile);
router.put('/password', auth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], authController.changePassword);

module.exports = router;
