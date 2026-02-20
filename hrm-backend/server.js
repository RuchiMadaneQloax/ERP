const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// =======================
// CORS Configuration
// =======================
app.use(
  cors({
    origin: "http://localhost:5173", // React frontend
    credentials: true,
  })
);

// =======================
// Middleware
// =======================
app.use(express.json());

// =======================
// Routes
// =======================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/designations", require("./routes/designationRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/leaves", require("./routes/leaveRoutes"));
// Employee self-service (login + my endpoints)
app.use('/api/employee-auth', require('./routes/employeeAuthRoutes'));
app.use('/api/employee', require('./routes/employeeSelfRoutes'));

// =======================
// Database Connection
// =======================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });


