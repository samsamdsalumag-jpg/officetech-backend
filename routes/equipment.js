const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const equipmentController = require('../controllers/equipmentController');

// Setup multer for image upload
const uploadDir = path.join(__dirname, '../uploads/equipment');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

router.get('/', auth, equipmentController.getAll);
router.get('/export/csv', auth, equipmentController.exportCSV);
router.get('/barcode/:barcode', auth, equipmentController.getByBarcode);
router.get('/:id', auth, equipmentController.getById);
router.post('/', auth, upload.single('image'), equipmentController.create);
router.put('/:id', auth, upload.single('image'), equipmentController.update);
router.delete('/:id', auth, equipmentController.delete);
router.post('/:id/generate-barcode', auth, equipmentController.generateBarcode);

module.exports = router;
