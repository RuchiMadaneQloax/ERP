const mongoose = require("mongoose");

const designationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },

    level: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Prevent duplicate designation title inside same department
designationSchema.index(
  { title: 1, department: 1 },
  { unique: true }
);

module.exports = mongoose.model("Designation", designationSchema);
