const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', auth, maintenanceController.getAll);
router.get('/:id', auth, maintenanceController.getById);
router.post('/', auth, maintenanceController.create);
router.put('/:id', auth, maintenanceController.update);
router.delete('/:id', auth, maintenanceController.delete);

module.exports = router;
