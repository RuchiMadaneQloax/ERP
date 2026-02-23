const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

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
// capture raw body for debugging JSON parse errors
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    try {
      req.rawBody = buf && buf.toString(encoding || "utf8");
    } catch (e) {
      req.rawBody = undefined;
    }
  },
}));

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

// JSON parse error handler (helps debug malformed request bodies)
app.use((err, req, res, next) => {
  if (err && (err instanceof SyntaxError || err.type === 'entity.parse.failed')) {
    const snippet = (req && req.rawBody) ? String(req.rawBody).slice(0, 200) : '<no raw body captured>';
    console.error('JSON parse error for', req.method, req.originalUrl, 'rawBodySnippet:', snippet);
    return res.status(400).json({ message: 'Invalid JSON body', rawBodySnippet: snippet });
  }
  next(err);
});

// =======================
// Database Connection
// =======================
async function connectMongoWithFallback() {
  const primaryUri = process.env.MONGO_URI;
  if (!primaryUri) {
    throw new Error("MONGO_URI is not set");
  }

  try {
    await mongoose.connect(primaryUri);
    return;
  } catch (err) {
    const isSrv = typeof primaryUri === "string" && primaryUri.startsWith("mongodb+srv://");
    const isSrvDnsError =
      err &&
      (err.code === "ENOTFOUND" ||
        (typeof err.hostname === "string" && err.hostname.includes("_mongodb._tcp")) ||
        (typeof err.message === "string" && err.message.includes("querySrv")));

    if (!isSrv || !isSrvDnsError) {
      throw err;
    }

    // Fallback 1: trailing-dot FQDN often helps in strict DNS environments.
    try {
      const atIndex = primaryUri.indexOf("@");
      if (atIndex !== -1) {
        const prefix = primaryUri.slice(0, atIndex + 1);
        const rest = primaryUri.slice(atIndex + 1);
        const slashIndex = rest.indexOf("/");
        const host = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
        const suffix = slashIndex === -1 ? "" : rest.slice(slashIndex);
        const dottedHost = host.endsWith(".") ? host : `${host}.`;
        const fallbackUri = `${prefix}${dottedHost}${suffix}`;
        await mongoose.connect(fallbackUri);
        return;
      }
    } catch (fallbackErr) {
      // continue to non-SRV fallback below
    }

    // Fallback 2: explicit non-SRV URI if provided.
    if (process.env.MONGO_NON_SRV) {
      await mongoose.connect(process.env.MONGO_NON_SRV);
      return;
    }

    throw err;
  }
}

connectMongoWithFallback()
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });


