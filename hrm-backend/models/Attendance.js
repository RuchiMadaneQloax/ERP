const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["present", "absent", "half-day"],
      required: true,
    },

    // optional overtime hours for the day
    overtimeHours: {
      type: Number,
      default: 0,
    },

    // mark if this date is a company holiday
    isHoliday: {
      type: Boolean,
      default: false,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance per employee per day
attendanceSchema.index(
  { employee: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
