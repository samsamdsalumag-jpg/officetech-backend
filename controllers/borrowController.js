const BorrowLog = require('../models/BorrowLog');
const Equipment = require('../models/Equipment');

exports.getAll = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 10, equipmentId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (equipmentId) query.equipment = equipmentId;
    if (search) {
      query.$or = [
        { borrowerName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    // Auto-update overdue status
    await BorrowLog.updateMany(
      { status: 'Borrowed', expectedReturn: { $lt: new Date() } },
      { $set: { status: 'Overdue' } }
    );

    const total = await BorrowLog.countDocuments(query);
    const logs = await BorrowLog.find(query)
      .populate('equipment', 'name barcode image category')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ logs, total, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (err) {
    next(err);
  }
};

exports.getOverdue = async (req, res, next) => {
  try {
    await BorrowLog.updateMany(
      { status: 'Borrowed', expectedReturn: { $lt: new Date() } },
      { $set: { status: 'Overdue' } }
    );
    const logs = await BorrowLog.find({ status: 'Overdue' })
      .populate('equipment', 'name barcode')
      .sort({ expectedReturn: 1 });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const log = await BorrowLog.findById(req.params.id)
      .populate('equipment', 'name barcode image')
      .populate('processedBy', 'name');
    if (!log) return res.status(404).json({ message: 'Borrow record not found' });
    res.json(log);
  } catch (err) {
    next(err);
  }
};

exports.borrow = async (req, res, next) => {
  try {
    const { equipmentId, borrowerName, department, contactNumber, purpose, quantityBorrowed = 1, expectedReturn, notes } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });
    if (equipment.isUnderMaintenance) return res.status(400).json({ message: 'This item is currently under maintenance' });
    if (equipment.availableStock < quantityBorrowed) {
      return res.status(400).json({ message: `Only ${equipment.availableStock} unit(s) available` });
    }

    const log = await BorrowLog.create({
      equipment: equipmentId,
      borrowerName,
      department,
      contactNumber,
      purpose,
      quantityBorrowed,
      expectedReturn,
      notes,
      processedBy: req.admin._id,
    });

    // Deduct stock
    equipment.availableStock -= quantityBorrowed;
    await equipment.save();

    await log.populate('equipment', 'name barcode image');
    await log.populate('processedBy', 'name');

    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
};

exports.returnItem = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const log = await BorrowLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Borrow record not found' });
    if (log.status === 'Returned') return res.status(400).json({ message: 'Item already returned' });

    log.status = 'Returned';
    log.actualReturn = new Date();
    if (notes) log.notes = notes;
    await log.save();

    // Restore stock
    await Equipment.findByIdAndUpdate(log.equipment, {
      $inc: { availableStock: log.quantityBorrowed }
    });

    await log.populate('equipment', 'name barcode image');
    res.json(log);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const log = await BorrowLog.findByIdAndDelete(req.params.id);
    if (!log) return res.status(404).json({ message: 'Borrow record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const logs = await BorrowLog.find()
      .populate('equipment', 'name barcode')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    const headers = ['Equipment', 'Barcode', 'Borrower', 'Department', 'Qty', 'Date Borrowed', 'Expected Return', 'Actual Return', 'Status'];
    const rows = logs.map(l => [
      l.equipment?.name, l.equipment?.barcode, l.borrowerName, l.department,
      l.quantityBorrowed, new Date(l.dateBorrowed).toLocaleDateString(),
      new Date(l.expectedReturn).toLocaleDateString(),
      l.actualReturn ? new Date(l.actualReturn).toLocaleDateString() : '',
      l.status
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ''}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="borrow-history.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
