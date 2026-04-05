const mongoose = require('mongoose');

const borrowLogSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  borrowerName: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  contactNumber: { type: String, default: '' },
  purpose: { type: String, default: '' },
  quantityBorrowed: { type: Number, required: true, min: 1, default: 1 },
  dateBorrowed: { type: Date, default: Date.now },
  expectedReturn: { type: Date, required: true },
  actualReturn: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['Borrowed', 'Returned', 'Overdue'], 
    default: 'Borrowed' 
  },
  notes: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

// Auto-check overdue status
borrowLogSchema.methods.checkOverdue = function() {
  if (this.status === 'Borrowed' && new Date() > this.expectedReturn) {
    this.status = 'Overdue';
  }
  return this;
};

module.exports = mongoose.model('BorrowLog', borrowLogSchema);
