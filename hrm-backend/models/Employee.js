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
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
