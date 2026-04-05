const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Equipment = require('../models/Equipment');
const BorrowLog = require('../models/BorrowLog');
const Maintenance = require('../models/Maintenance');

router.get('/inventory-summary', auth, async (req, res, next) => {
  try {
    const equipment = await Equipment.find().populate('category', 'name color');
    res.json(equipment);
  } catch (err) { next(err); }
});

router.get('/low-stock', auth, async (req, res, next) => {
  try {
    const items = await Equipment.find({
      $expr: { $lte: ['$availableStock', '$lowStockThreshold'] }
    }).populate('category', 'name color');
    res.json(items);
  } catch (err) { next(err); }
});

router.get('/borrow-history', auth, async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (startDate || endDate) {
      query.dateBorrowed = {};
      if (startDate) query.dateBorrowed.$gte = new Date(startDate);
      if (endDate) query.dateBorrowed.$lte = new Date(endDate);
    }
    const logs = await BorrowLog.find(query)
      .populate('equipment', 'name barcode category')
      .sort({ dateBorrowed: -1 });
    res.json(logs);
  } catch (err) { next(err); }
});

router.get('/maintenance-history', auth, async (req, res, next) => {
  try {
    const records = await Maintenance.find()
      .populate('equipment', 'name barcode')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) { next(err); }
});

router.get('/yearly-summary', auth, async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // Borrow statistics
    const borrowStats = await BorrowLog.aggregate([
      { $match: { dateBorrowed: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $month: '$dateBorrowed' }, count: { $sum: 1 }, total: { $sum: '$quantityBorrowed' } } },
      { $sort: { _id: 1 } }
    ]);

    // Maintenance statistics
    const maintenanceStats = await Maintenance.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 }, totalCost: { $sum: { $ifNull: ['$cost', 0] } } } },
      { $sort: { _id: 1 } }
    ]);

    // Monthly breakdown
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, idx) => {
      const borrowData = borrowStats.find(s => s._id === idx + 1);
      const mainData = maintenanceStats.find(s => s._id === idx + 1);
      return {
        month,
        borrows: borrowData?.count || 0,
        borrowQuantity: borrowData?.total || 0,
        maintenance: mainData?.count || 0,
        maintenanceCost: mainData?.totalCost || 0
      };
    });

    // Summary totals
    const totalBorrows = borrowStats.reduce((sum, s) => sum + s.count, 0);
    const totalItems = borrowStats.reduce((sum, s) => sum + s.total, 0);
    const totalMaintenance = maintenanceStats.reduce((sum, s) => sum + s.count, 0);
    const totalCost = maintenanceStats.reduce((sum, s) => sum + s.totalCost, 0);

    res.json({
      year,
      monthlyData,
      totals: {
        borrows: totalBorrows,
        borrowedItems: totalItems,
        maintenanceRecords: totalMaintenance,
        maintenanceCost: totalCost.toFixed(2)
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
