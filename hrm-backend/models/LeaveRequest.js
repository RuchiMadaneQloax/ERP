const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },

  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveType",
    required: true,
  },

  startDate: {
    type: Date,
    required: true,
  },

  endDate: {
    type: Date,
    required: true,
  },

  totalDays: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  reason: {
    type: String,
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
  reviewedAt: {
    type: Date,
  },

}, { timestamps: true });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
