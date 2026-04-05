const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  issueDescription: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'], 
    default: 'Pending' 
  },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  cost: { type: Number, default: 0, min: 0 },
  technician: { type: String, default: '' },
  dateReported: { type: Date, default: Date.now },
  dateStarted: { type: Date, default: null },
  dateCompleted: { type: Date, default: null },
  resolution: { type: String, default: '' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);
