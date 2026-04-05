const mongoose = require('mongoose');

const equipmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  barcode: { type: String, unique: true, sparse: true },
  quantity: { type: Number, required: true, min: 0, default: 1 },
  availableStock: { type: Number, required: true, min: 0, default: 1 },
  location: { type: String, trim: true, default: 'Main Office' },
  condition: { 
    type: String, 
    enum: ['Good', 'Damaged', 'Maintenance'], 
    default: 'Good' 
  },
  description: { type: String, default: '' },
  image: { type: String, default: null },
  lowStockThreshold: { type: Number, default: 2 },
  isUnderMaintenance: { type: Boolean, default: false },
  serialNumber: { type: String, default: '' },
  model: { type: String, default: '' },
  brand: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate barcode if not provided
equipmentSchema.pre('save', async function(next) {
  if (!this.barcode) {
    this.barcode = 'OT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

// Virtual for low stock check
equipmentSchema.virtual('isLowStock').get(function() {
  return this.availableStock <= this.lowStockThreshold;
});

equipmentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Equipment', equipmentSchema);
