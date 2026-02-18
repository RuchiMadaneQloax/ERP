const LeaveType = require("../models/LeaveType");
const LeaveRequest = require("../models/LeaveRequest");
const Employee = require("../models/Employee");

// =======================================
// CREATE LEAVE TYPE (Superadmin)
// =======================================
exports.createLeaveType = async (req, res) => {
  try {
    const { name, maxDaysPerYear } = req.body;

    const existing = await LeaveType.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Leave type already exists" });
    }

    const leaveType = await LeaveType.create({
      name,
      maxDaysPerYear,
    });

    res.status(201).json(leaveType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET ALL LEAVE TYPES
// =======================================
exports.getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.find({ isActive: true });
    res.json(leaveTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// APPLY LEAVE (HR)
// =======================================
exports.applyLeave = async (req, res) => {
  try {
    const { employee, leaveType, startDate, endDate, reason } = req.body;

    const emp = await Employee.findById(employee);
    if (!emp) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const totalDays =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Prevent overlapping leave
    const overlap = await LeaveRequest.findOne({
      employee,
      status: { $in: ["pending", "approved"] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      ],
    });

    if (overlap) {
      return res.status(400).json({
        message: "Overlapping leave request exists",
      });
    }

    const leave = await LeaveRequest.create({
      employee,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
    });

    const populated = await LeaveRequest.findById(leave._id)
      .populate("employee", "name")
      .populate("leaveType", "name");

    res.status(201).json(populated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// APPROVE / REJECT LEAVE (Superadmin)
// =======================================
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const leave = await LeaveRequest.findById(id);

    if (!leave) {
      return res.status(404).json({
        message: "Leave request not found",
      });
    }

    const prevStatus = leave.status;
    leave.status = status;
    leave.reviewedBy = req.admin.id;

    await leave.save();

    // If status changed to approved, check and deduct from employee leaveBalances
    if (status === 'approved' && prevStatus !== 'approved') {
      // check remaining balance before approving
      try {
        const empCheck = await Employee.findById(leave.employee);
        if (empCheck) {
          let lb = empCheck.leaveBalances.find(lb => lb.leaveType && lb.leaveType.toString() === leave.leaveType.toString());
          if (!lb) {
            const lt = await LeaveType.findById(leave.leaveType);
            lb = { leaveType: leave.leaveType, allocated: lt?.maxDaysPerYear || 0, used: 0 };
          }
          const remaining = (lb.allocated || 0) - (lb.used || 0);
          if (remaining < (leave.totalDays || 0)) {
            return res.status(400).json({ message: 'Insufficient leave balance to approve this request' });
          }
        }
      } catch (err) {
        console.warn('Could not verify leave balance before approval:', err.message);
      }

      // proceed to deduct after check
      try {
        const emp = await Employee.findById(leave.employee);
        if (emp) {
          // find existing balance for the leave type
          let idx = emp.leaveBalances.findIndex(lb => lb.leaveType && lb.leaveType.toString() === leave.leaveType.toString());
          if (idx === -1) {
            // create a new balance entry based on the leave type allocation
            const lt = await LeaveType.findById(leave.leaveType);
            const alloc = lt?.maxDaysPerYear || 0;
            emp.leaveBalances.push({ leaveType: leave.leaveType, allocated: alloc, used: 0 });
            idx = emp.leaveBalances.length - 1;
          }

          emp.leaveBalances[idx].used = (emp.leaveBalances[idx].used || 0) + (leave.totalDays || 0);
          await emp.save();
        }
      } catch (err) {
        console.warn('Failed to update employee leave balances:', err.message);
      }
    }

    const updated = await LeaveRequest.findById(id)
      .populate("employee")
      .populate("leaveType", "name")
      .populate("reviewedBy", "name");

    res.json(updated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================================
// GET ALL LEAVE REQUESTS
// =======================================
exports.getLeaveRequests = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find()
      .populate("employee")
      .populate("leaveType", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
