const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: {
      type: String, // Format: "2026-02"
      required: true,
    },

    baseSalary: {
      type: Number,
      required: true,
    },

    // Overtime / holiday / adjustments
    overtimeHours: { type: Number, default: 0 },
    overtimeRate: { type: Number, default: 0 }, // per hour
    overtimePay: { type: Number, default: 0 },
    holidayPay: { type: Number, default: 0 },
    adjustments: [
      {
        label: String,
        amount: Number,
      },
    ],
    dynamicBaseSalary: { type: Number }, // optional override for base salary when dynamic adjustments applied

    presentDays: {
      type: Number,
      default: 0,
    },

    absentDays: {
      type: Number,
      default: 0,
    },

    halfDays: {
      type: Number,
      default: 0,
    },

    finalSalary: {
      type: Number,
      required: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate payroll for same employee and month
payrollSchema.index(
  { employee: 1, month: 1 },
  { unique: true }
);

module.exports = mongoose.model("Payroll", payrollSchema);
