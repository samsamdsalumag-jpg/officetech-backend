const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const borrowController = require('../controllers/borrowController');

router.get('/', auth, borrowController.getAll);
router.get('/export/csv', auth, borrowController.exportCSV);
router.get('/overdue', auth, borrowController.getOverdue);
router.get('/:id', auth, borrowController.getById);
router.post('/', auth, borrowController.borrow);
router.put('/:id/return', auth, borrowController.returnItem);
router.delete('/:id', auth, borrowController.delete);

module.exports = router;
