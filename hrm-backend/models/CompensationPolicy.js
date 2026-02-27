const mongoose = require("mongoose");

const deductionRuleSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["percent", "fixed"], required: true },
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const compensationPolicySchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "global" },
    taxRatePercent: { type: Number, default: 0, min: 0 },
    deductions: { type: [deductionRuleSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompensationPolicy", compensationPolicySchema);
