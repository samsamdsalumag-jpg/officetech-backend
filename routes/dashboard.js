const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Equipment = require('../models/Equipment');
const BorrowLog = require('../models/BorrowLog');
const Maintenance = require('../models/Maintenance');
const Category = require('../models/Category');

router.get('/stats', auth, async (req, res, next) => {
  try {
    // Auto-update overdue
    await BorrowLog.updateMany(
      { status: 'Borrowed', expectedReturn: { $lt: new Date() } },
      { $set: { status: 'Overdue' } }
    );

    const [
      totalEquipment,
      totalItems,
      availableItems,
      borrowedCount,
      overdueCount,
      maintenanceCount,
      lowStockItems,
      categoryBreakdown,
      recentActivity,
      monthlyBorrows
    ] = await Promise.all([
      Equipment.countDocuments(),
      Equipment.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' } } }]).catch(() => [{ total: 0 }]),
      Equipment.aggregate([{ $group: { _id: null, total: { $sum: '$availableStock' } } }]).catch(() => [{ total: 0 }]),
      BorrowLog.countDocuments({ status: 'Borrowed' }).catch(() => 0),
      BorrowLog.countDocuments({ status: 'Overdue' }).catch(() => 0),
      Maintenance.countDocuments({ status: { $in: ['Pending', 'In Progress'] } }).catch(() => 0),
      Equipment.countDocuments({ $expr: { $lte: ['$availableStock', '$lowStockThreshold'] } }).catch(() => 0),
      Equipment.aggregate([
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
        { $unwind: { path: '$cat', preserveNullAndEmpty: true } },
        { $group: { _id: '$cat.name', count: { $sum: 1 }, color: { $first: '$cat.color' } } },
        { $sort: { count: -1 } }
      ]).catch(() => []),
      BorrowLog.find()
        .populate('equipment', 'name image')
        .sort({ createdAt: -1 })
        .limit(8)
        .catch(() => []),
      BorrowLog.aggregate([
        { $match: { dateBorrowed: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } } },
        { $group: {
          _id: { year: { $year: '$dateBorrowed' }, month: { $month: '$dateBorrowed' } },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]).catch(() => [])
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
      stats: {
        totalEquipment,
        totalItems: totalItems[0]?.total || 0,
        availableItems: availableItems[0]?.total || 0,
        borrowedCount,
        overdueCount,
        maintenanceCount,
        lowStockItems,
      },
      categoryBreakdown: categoryBreakdown.map(c => ({ name: c._id || 'Uncategorized', value: c.count, color: c.color })),
      recentActivity: recentActivity.filter(log => log && log.equipment).map(log => ({
        id: log._id,
        type: log.status === 'Returned' ? 'return' : 'borrow',
        equipment: log.equipment?.name || 'Unknown',
        image: log.equipment?.image,
        borrower: log.borrowerName,
        date: log.status === 'Returned' ? log.actualReturn : log.dateBorrowed,
        status: log.status,
      })),
      monthlyBorrows: monthlyBorrows.map(m => ({
        month: months[m._id.month - 1],
        count: m.count
      }))
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    next(err);
  }
});

module.exports = router;
