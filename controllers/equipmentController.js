const Equipment = require('../models/Equipment');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

exports.getAll = async (req, res, next) => {
  try {
    const { search, category, condition, page = 1, limit = 10, lowStock } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (condition) query.condition = condition;
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$availableStock', '$lowStockThreshold'] };
    }

    const total = await Equipment.countDocuments(query);
    const equipment = await Equipment.find(query)
      .populate('category', 'name color')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      equipment,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id).populate('category', 'name color');
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    res.json(equipment);
  } catch (err) {
    next(err);
  }
};

exports.getByBarcode = async (req, res, next) => {
  try {
    const equipment = await Equipment.findOne({ barcode: req.params.barcode }).populate('category', 'name color');
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    res.json(equipment);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = `/uploads/equipment/${req.file.filename}`;
    }
    if (data.quantity && !data.availableStock) {
      data.availableStock = data.quantity;
    }
    const equipment = await Equipment.create(data);
    await equipment.populate('category', 'name color');
    res.status(201).json(equipment);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = `/uploads/equipment/${req.file.filename}`;
      // Delete old image
      const old = await Equipment.findById(req.params.id);
      if (old?.image) {
        const oldPath = path.join(__dirname, '..', old.image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true })
      .populate('category', 'name color');
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    res.json(equipment);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    if (equipment.image) {
      const imgPath = path.join(__dirname, '..', equipment.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.generateBarcode = async (req, res, next) => {
  try {
    const equipment = await Equipment.findById(req.params.id);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    if (!equipment.barcode) {
      equipment.barcode = 'OT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
      await equipment.save();
    }

    const barcodeDataURL = await QRCode.toDataURL(equipment.barcode, {
      width: 200,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' }
    });

    res.json({ barcode: equipment.barcode, barcodeImage: barcodeDataURL });
  } catch (err) {
    next(err);
  }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const equipment = await Equipment.find().populate('category', 'name');
    
    const headers = ['Name', 'Category', 'Barcode', 'Quantity', 'Available', 'Location', 'Condition', 'Brand', 'Model', 'Date Added'];
    const rows = equipment.map(e => [
      e.name, e.category?.name || '', e.barcode, e.quantity, e.availableStock,
      e.location, e.condition, e.brand, e.model, new Date(e.createdAt).toLocaleDateString()
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
