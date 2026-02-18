const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  action: { type: String, required: true },
  details: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
