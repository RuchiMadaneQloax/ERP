import { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const FaceAttendance = () => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("checkin");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

  const captureAndMark = async (nextAction = action) => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const imageSrc = webcamRef.current?.getScreenshot?.();
      if (!imageSrc) {
        setError("Could not capture image. Please allow camera access.");
        setLoading(false);
        return;
      }

      const response = await axios.post(`${baseUrl}/api/attendance/face`, {
        image: imageSrc,
        action: nextAction,
      });

      setResult(response.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Face recognition failed");
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", minHeight: "100vh", background: "#f3f4f6" }}>
      <h2 style={{ marginTop: 0 }}>Kiosk Face Attendance</h2>
      <p style={{ color: "#6b7280", marginTop: 4 }}>
        Open this on a phone/tablet using <strong>/kiosk-face</strong>
      </p>

      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={360}
        height={280}
        videoConstraints={{ facingMode: "user" }}
      />

      <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setAction("checkin")}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: action === "checkin" ? "1px solid #14532d" : "1px solid #d1d5db",
            background: action === "checkin" ? "#14532d" : "#fff",
            color: action === "checkin" ? "#fff" : "#111827",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Check-In
        </button>
        <button
          onClick={() => setAction("checkout")}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: action === "checkout" ? "1px solid #7c2d12" : "1px solid #d1d5db",
            background: action === "checkout" ? "#7c2d12" : "#fff",
            color: action === "checkout" ? "#fff" : "#111827",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Check-Out
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => captureAndMark(action)}
          disabled={loading}
          style={{
            padding: "12px 20px",
            fontSize: "16px",
            cursor: "pointer",
            borderRadius: 8,
            border: "none",
            background: "#1f2937",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {loading ? "Processing..." : `Mark ${action === "checkin" ? "Check-In" : "Check-Out"}`}
        </button>
      </div>

      {result && (
        <div style={{ color: "green", marginTop: 14 }}>
          <h3>Attendance Marked</h3>
          <p><strong>Action:</strong> {String(result?.action || action).toUpperCase()}</p>
          <p><strong>Name:</strong> {result?.attendance?.employee?.name || "-"}</p>
          <p><strong>Confidence:</strong> {result?.confidence ?? "-"}</p>
        </div>
      )}

      {error && (
        <div style={{ color: "red", marginTop: 14 }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default FaceAttendance;
