const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

const app = express();

// =======================
// ENV VARIABLES
// =======================
const PORT = process.env.PORT || 5000;

// =======================
// CORS Configuration
// =======================
// In production, FRONTEND_URL will be set in Render env variables
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// =======================
// Middleware
// =======================
app.use(
  express.json({
    verify: (req, res, buf, encoding) => {
      try {
        req.rawBody = buf && buf.toString(encoding || "utf8");
      } catch (e) {
        req.rawBody = undefined;
      }
    },
  })
);

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
app.use("/api/employee-auth", require("./routes/employeeAuthRoutes"));
app.use("/api/employee", require("./routes/employeeSelfRoutes"));

// =======================
// JSON Parse Error Handler
// =======================
app.use((err, req, res, next) => {
  if (err && (err instanceof SyntaxError || err.type === "entity.parse.failed")) {
    const snippet =
      req && req.rawBody
        ? String(req.rawBody).slice(0, 200)
        : "<no raw body captured>";
    console.error(
      "JSON parse error for",
      req.method,
      req.originalUrl,
      "rawBodySnippet:",
      snippet
    );
    return res
      .status(400)
      .json({ message: "Invalid JSON body", rawBodySnippet: snippet });
  }
  next(err);
});

// =======================
// Database Connection
// =======================
async function connectMongoWithFallback() {
  const primaryUri = process.env.MONGO_URI;

  if (!primaryUri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    const atIndex = primaryUri.indexOf("@");
    const hostPart = atIndex >= 0 ? primaryUri.slice(atIndex + 1).split("/")[0] : "<hidden>";
    console.log("Using Mongo host:", hostPart);
  } catch {
    // no-op
  }

  try {
    await mongoose.connect(primaryUri);
    console.log("MongoDB Connected");
    return;
  } catch (err) {
    console.error("Primary Mongo connection failed:", err.message);

    const isSrv =
      typeof primaryUri === "string" &&
      primaryUri.startsWith("mongodb+srv://");

    const isSrvDnsError =
      err &&
      (err.code === "ENOTFOUND" ||
        (typeof err.hostname === "string" &&
          err.hostname.includes("_mongodb._tcp")) ||
        (typeof err.message === "string" &&
          err.message.includes("querySrv")));

    if (!isSrv || !isSrvDnsError) {
      throw err;
    }

    // Fallback 1: trailing-dot FQDN
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
        console.log("MongoDB Connected (fallback)");
        return;
      }
    } catch (fallbackErr) {
      console.error("Fallback Mongo connection failed:", fallbackErr.message);
    }

    if (process.env.MONGO_NON_SRV) {
      await mongoose.connect(process.env.MONGO_NON_SRV);
      console.log("MongoDB Connected (non-SRV fallback)");
      return;
    }

    throw err;
  }
}

// =======================
// Start Server
// =======================
connectMongoWithFallback()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
