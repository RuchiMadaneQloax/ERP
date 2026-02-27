const mongoose = require("mongoose");

const employeeFeedbackSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    kind: {
      type: String,
      enum: ["chat", "review"],
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    botReply: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmployeeFeedback", employeeFeedbackSchema);
