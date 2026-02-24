const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    // optional hashed password for employee self-service
    password: {
      type: String,
      required: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
      required: true,
    },
    salary: {
      type: Number,
      required: true,
    },
    // leave balances per leave type
    leaveBalances: [
      {
        leaveType: { type: mongoose.Schema.Types.ObjectId, ref: "LeaveType" },
        allocated: { type: Number, default: 0 },
        used: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },

    // ✅ NEW FIELD ADDED FOR FACIAL RECOGNITION
    faceEmbedding: {
      type: [Number], // stores 128D face embedding vector
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
