const Employee = require("../models/Employee");
const CompensationPolicy = require("../models/CompensationPolicy");

async function getOrCreatePolicy(adminId = null) {
  let policy = await CompensationPolicy.findOne({ key: "global" });
  if (!policy) {
    policy = await CompensationPolicy.create({
      key: "global",
      taxRatePercent: 0,
      deductions: [],
      updatedBy: adminId || undefined,
    });
  }
  return policy;
}

exports.getPolicy = async (req, res) => {
  try {
    const policy = await getOrCreatePolicy(req.admin?.id);
    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { taxRatePercent = 0, deductions = [] } = req.body || {};
    const normalizedTax = Math.max(0, Number(taxRatePercent || 0));
    const normalizedDeductions = Array.isArray(deductions)
      ? deductions
          .map((d) => ({
            label: String(d?.label || "").trim(),
            type: d?.type === "fixed" ? "fixed" : "percent",
            value: Math.max(0, Number(d?.value || 0)),
          }))
          .filter((d) => d.label && Number.isFinite(d.value))
      : [];

    const policy = await CompensationPolicy.findOneAndUpdate(
      { key: "global" },
      {
        $set: {
          key: "global",
          taxRatePercent: normalizedTax,
          deductions: normalizedDeductions,
          updatedBy: req.admin?.id || undefined,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(policy);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.assignSalaries = async (req, res) => {
  try {
    const { assignments = [] } = req.body || {};
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ message: "assignments are required" });
    }

    const operations = assignments
      .map((a) => ({
        employeeId: a?.employeeId || a?.id,
        salary: Number(a?.salary),
      }))
      .filter((a) => a.employeeId && Number.isFinite(a.salary) && a.salary >= 0)
      .map((a) => ({
        updateOne: {
          filter: { _id: a.employeeId },
          update: { $set: { salary: a.salary } },
        },
      }));

    if (operations.length === 0) {
      return res.status(400).json({ message: "No valid assignments provided" });
    }

    const result = await Employee.bulkWrite(operations);
    res.json({
      message: "Salaries assigned successfully",
      modifiedCount: result?.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.reviseSalaries = async (req, res) => {
  try {
    const { mode = "percent", value = 0, employeeIds = [] } = req.body || {};
    const numericValue = Number(value || 0);
    if (!Number.isFinite(numericValue)) {
      return res.status(400).json({ message: "Invalid revision value" });
    }

    const filter = {
      status: "active",
      ...(Array.isArray(employeeIds) && employeeIds.length > 0 ? { _id: { $in: employeeIds } } : {}),
    };
    const employees = await Employee.find(filter).select("_id salary");
    if (employees.length === 0) {
      return res.status(400).json({ message: "No employees found for revision" });
    }

    const operations = employees.map((emp) => {
      const current = Number(emp.salary || 0);
      const next =
        mode === "fixed"
          ? Math.max(0, current + numericValue)
          : Math.max(0, current + (current * numericValue) / 100);

      return {
        updateOne: {
          filter: { _id: emp._id },
          update: { $set: { salary: Number(next.toFixed(2)) } },
        },
      };
    });

    const result = await Employee.bulkWrite(operations);
    res.json({
      message: "Salary revision applied",
      mode,
      value: numericValue,
      modifiedCount: result?.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
