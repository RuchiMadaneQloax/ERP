import { useRef, useState } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const FaceAttendance = () => {
  const webcamRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const captureAndMark = async () => {
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const imageSrc = webcamRef.current.getScreenshot();

      const response = await axios.post(
        "http://localhost:5000/api/attendance/face",
        { image: imageSrc }
      );

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Face recognition failed"
      );
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "30px" }}>
      <h2>Face Attendance</h2>

      <Webcam
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={400}
        height={300}
        videoConstraints={{ facingMode: "user" }}
      />

      <br /><br />

      <button
        onClick={captureAndMark}
        disabled={loading}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer"
        }}
      >
        {loading ? "Processing..." : "Mark Attendance"}
      </button>

      <br /><br />

      {result && (
        <div style={{ color: "green" }}>
          <h3>✅ Attendance Marked</h3>
          <p><strong>Name:</strong> {result.attendance.employee.name}</p>
          <p><strong>Confidence:</strong> {result.confidence}</p>
        </div>
      )}

      {error && (
        <div style={{ color: "red" }}>
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default FaceAttendance;
