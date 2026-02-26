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
      enum: ["present", "absent", "half-day", "holiday"],
      required: true,
    },

    overtimeHours: {
      type: Number,
      default: 0,
    },

    isHoliday: {
      type: Boolean,
      default: false,
    },

    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: false,
    },

    // ✅ NEW OPTIONAL FIELDS FOR FACE SYSTEM
    checkInTime: {
      type: Date,
    },

    checkOutTime: {
      type: Date,
    },

    method: {
      type: String,
      enum: ["manual", "face", "system"],
      default: "manual",
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { employee: 1, date: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
