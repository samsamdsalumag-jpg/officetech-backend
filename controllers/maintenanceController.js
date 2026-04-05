const Maintenance = require('../models/Maintenance');
const Equipment = require('../models/Equipment');

exports.getAll = async (req, res, next) => {
  try {
    const { status, equipmentId, search, page = 1, limit = 10 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (equipmentId) query.equipment = equipmentId;

    // If search query is provided, search in issueDescription or technician
    if (search) {
      query.$or = [
        { issueDescription: { $regex: search, $options: 'i' } },
        { technician: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Maintenance.countDocuments(query);
    const records = await Maintenance.find(query)
      .populate('equipment', 'name barcode image condition')
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ records, total, pages: Math.ceil(total / limit), currentPage: parseInt(page) });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const record = await Maintenance.findById(req.params.id)
      .populate('equipment', 'name barcode image')
      .populate('reportedBy', 'name');
    if (!record) return res.status(404).json({ message: 'Maintenance record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { equipmentId, issueDescription, priority, technician, notes } = req.body;

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return res.status(404).json({ message: 'Equipment not found' });

    const record = await Maintenance.create({
      equipment: equipmentId,
      issueDescription,
      priority,
      technician,
      reportedBy: req.admin._id,
    });

    // Mark equipment as under maintenance
    await Equipment.findByIdAndUpdate(equipmentId, {
      isUnderMaintenance: true,
      condition: 'Maintenance'
    });

    await record.populate('equipment', 'name barcode image');
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { status, cost, resolution, dateStarted, dateCompleted, priority, technician } = req.body;

    const record = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { status, cost, resolution, dateStarted, dateCompleted, priority, technician },
      { new: true }
    ).populate('equipment', 'name barcode image');

    if (!record) return res.status(404).json({ message: 'Record not found' });

    // If completed, restore equipment status
    if (status === 'Completed' || status === 'Cancelled') {
      await Equipment.findByIdAndUpdate(record.equipment._id, {
        isUnderMaintenance: false,
        condition: status === 'Completed' ? 'Good' : undefined,
      });
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const record = await Maintenance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    
    // Check if equipment still has active maintenance
    const active = await Maintenance.findOne({ equipment: record.equipment, status: { $in: ['Pending', 'In Progress'] } });
    if (!active) {
      await Equipment.findByIdAndUpdate(record.equipment, { isUnderMaintenance: false });
    }

    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
};
