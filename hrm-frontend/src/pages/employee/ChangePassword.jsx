import React, { useState } from "react";
import { changeEmployeePassword } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function ChangePassword() {
  const { token, logout } = useAuth();
  const effectiveToken = token ?? localStorage.getItem("token");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await changeEmployeePassword(
        { currentPassword, newPassword },
        effectiveToken
      );

      if (res?.message === "Password changed successfully") {
        setMessage("Password changed successfully. Please login again.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => logout(), 1200);
      } else {
        setError(res?.message || "Could not change password.");
      }
    } catch {
      setError("Error changing password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Change Password</h3>
      <p style={styles.subtitle}>Update your employee portal password.</p>

      <form onSubmit={submit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}
        {message ? <div style={styles.success}>{message}</div> : null}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e5d9f4",
    borderRadius: 12,
    padding: 14,
    maxWidth: 520,
  },
  title: { margin: 0, color: "#4b316c", fontSize: 20 },
  subtitle: { margin: "6px 0 14px 0", color: "#6e5a86", fontSize: 13 },
  form: { display: "grid", gap: 10 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "#6e5a86", fontWeight: 700 },
  input: {
    border: "1px solid #ddcdef",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#fcf9ff",
    color: "#3f2d57",
  },
  button: {
    marginTop: 6,
    border: "none",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#6f4a99",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
  },
  success: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
  },
};

