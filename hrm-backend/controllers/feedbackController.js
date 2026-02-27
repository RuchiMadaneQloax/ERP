const axios = require("axios");
const Employee = require("../models/Employee");
const EmployeeFeedback = require("../models/EmployeeFeedback");

function buildFallbackReply(message = "") {
  const text = String(message || "").toLowerCase();

  if (text.includes("attendance") || text.includes("check-in") || text.includes("checkout")) {
    return "Attendance issues noted. Please include date/time in your next message so HR can verify quickly.";
  }
  if (text.includes("leave")) {
    return "Leave feedback received. Mention leave type and request dates so the team can review it accurately.";
  }
  if (text.includes("salary") || text.includes("payroll")) {
    return "Payroll feedback recorded. Share the month and expected vs actual amount so we can escalate to payroll.";
  }
  if (text.includes("manager") || text.includes("team")) {
    return "Thank you for sharing team feedback. HR will review this confidentially.";
  }
  if (text.includes("bug") || text.includes("error") || text.includes("issue")) {
    return "Thanks for reporting this issue. Please add page name and exact steps so support can reproduce it.";
  }

  return "Thanks for your feedback. It has been recorded and will be reviewed by HR/admin.";
}

async function generateAiReply(message) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallbackReply(message);

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are an HRMS employee feedback assistant. Keep replies concise, empathetic, and action-oriented.",
          },
          {
            role: "user",
            content: String(message || ""),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 12000,
      }
    );

    const text = response?.data?.output_text;
    if (text && String(text).trim()) return String(text).trim();
    return buildFallbackReply(message);
  } catch {
    return buildFallbackReply(message);
  }
}

exports.chatFeedback = async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    const message = String(req.body?.message || "").trim();
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    if (!message) return res.status(400).json({ message: "Message is required" });

    const employee = await Employee.findById(employeeId).select("_id status");
    if (!employee || employee.status !== "active") {
      return res.status(404).json({ message: "Employee not found or inactive" });
    }

    const botReply = await generateAiReply(message);
    const row = await EmployeeFeedback.create({
      employee: employeeId,
      kind: "chat",
      message,
      botReply,
    });

    res.status(201).json({
      id: row._id,
      kind: row.kind,
      message: row.message,
      botReply: row.botReply,
      createdAt: row.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitReview = async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    const review = String(req.body?.review || "").trim();
    const rating = Number(req.body?.rating);
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });
    if (!review) return res.status(400).json({ message: "Review is required" });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const row = await EmployeeFeedback.create({
      employee: employeeId,
      kind: "review",
      message: review,
      rating,
      botReply: "Thank you. Your review has been submitted successfully.",
    });

    res.status(201).json({
      id: row._id,
      kind: row.kind,
      message: row.message,
      rating: row.rating,
      createdAt: row.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyFeedbackHistory = async (req, res) => {
  try {
    const employeeId = req.employee?.id;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });

    const rows = await EmployeeFeedback.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
