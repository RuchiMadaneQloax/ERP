import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { enrollMyFace, getMyEmployeeProfile, markAttendanceByFace } from "../../services/api";
import formatDate from "../../utils/formatDate";

export default function EmployeeProfile() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const effectiveToken = token || localStorage.getItem("token");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [faceMode, setFaceMode] = useState("enroll");
  const [actionMessage, setActionMessage] = useState("");
  const [capturedEnrollImages, setCapturedEnrollImages] = useState([]);
  const webcamRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getMyEmployeeProfile(effectiveToken);
        if (res?._id) {
          setProfile(res);
          setFaceMode(res?.faceEnrolled ? "mark" : "enroll");
        } else {
          setError(res?.message || "Could not load profile");
        }
      } catch (err) {
        setError(err?.message || "Could not load profile");
      } finally {
        setLoading(false);
      }
    };

    if (effectiveToken) loadProfile();
  }, [effectiveToken]);

  const handleFaceEnroll = async () => {
    setActionMessage("");
    if (capturedEnrollImages.length !== 3) {
      setActionMessage("Capture exactly 3 photos before registering.");
      return;
    }

    try {
      setEnrolling(true);
      const res = await enrollMyFace(capturedEnrollImages, effectiveToken);
      if (res?.message) {
        setActionMessage(`${res.message}. You can now mark attendance.`);
        setCapturedEnrollImages([]);
        setProfile((prev) => ({ ...(prev || {}), faceEnrolled: true }));
        setFaceMode("mark");
      } else {
        setActionMessage("Face registration failed");
      }
    } catch (err) {
      setActionMessage(err?.message || "Face registration failed");
    } finally {
      setEnrolling(false);
    }
  };

  const captureEnrollPhoto = () => {
    if (capturedEnrollImages.length >= 3) return;
    const imageSrc = webcamRef.current?.getScreenshot?.();
    if (!imageSrc) {
      setActionMessage("Could not capture photo. Please allow camera access and try again.");
      return;
    }
    setCapturedEnrollImages((prev) => [...prev, imageSrc]);
    setActionMessage("");
  };

  const removeEnrollPhoto = (index) => {
    setCapturedEnrollImages((prev) => prev.filter((_, i) => i !== index));
  };

  const resetEnrollPhotos = () => {
    setCapturedEnrollImages([]);
    setActionMessage("");
  };

  const handleFacePunch = async (action) => {
    setActionMessage("");
    const imageSrc = webcamRef.current?.getScreenshot?.();
    if (!imageSrc) {
      setActionMessage("Could not capture photo. Please allow camera access and try again.");
      return;
    }

    try {
      setProcessingAttendance(true);
      const res = await markAttendanceByFace(imageSrc, effectiveToken, action);
      const confidence = typeof res?.confidence === "number" ? ` (confidence: ${res.confidence})` : "";
      setActionMessage(`${res?.message || "Attendance marked"}${confidence}`);
      setTimeout(() => navigate("/employee/attendance?marked=1"), 600);
    } catch (err) {
      setActionMessage(err?.message || "Attendance marking failed");
    } finally {
      setProcessingAttendance(false);
    }
  };

  if (loading) {
    return <div style={styles.loadingCard}>Loading profile...</div>;
  }

  if (error) {
    return <div style={styles.errorCard}>{error}</div>;
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>My Profile</h2>
          <p style={styles.subtitle}>Basic employee details</p>
        </div>
        <div style={styles.badge}>
          {String(profile?.status || "active").toUpperCase()}
        </div>
      </div>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Identity</h3>
          <div style={styles.list}>
            <div style={styles.item}><span style={styles.label}>Name</span><span style={styles.value}>{profile?.name || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Employee ID</span><span style={styles.value}>{profile?.employeeId || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Email</span><span style={styles.value}>{profile?.email || "-"}</span></div>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Organization</h3>
          <div style={styles.list}>
            <div style={styles.item}><span style={styles.label}>Department</span><span style={styles.value}>{profile?.department?.name || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Designation</span><span style={styles.value}>{profile?.designation?.title || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Designation Level</span><span style={styles.value}>{profile?.designation?.level ?? "-"}</span></div>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Employment</h3>
          <div style={styles.list}>
            <div style={styles.item}><span style={styles.label}>Joining Date</span><span style={styles.value}>{formatDate(profile?.joiningDate) || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Account Created</span><span style={styles.value}>{formatDate(profile?.createdAt) || "-"}</span></div>
            <div style={styles.item}><span style={styles.label}>Last Updated</span><span style={styles.value}>{formatDate(profile?.updatedAt) || "-"}</span></div>
          </div>
        </section>

        <section style={styles.card}>
          <h3 style={styles.cardTitle}>Compensation</h3>
          <div style={styles.list}>
            <div style={styles.item}>
              <span style={styles.label}>Current Salary</span>
              <span style={styles.value}>
                {typeof profile?.salary === "number" ? `INR ${profile.salary.toLocaleString("en-IN")}` : "-"}
              </span>
            </div>
          </div>
        </section>
      </div>

      <section style={styles.card}>
        <h3 style={styles.cardTitle}>Biometric Face Registration</h3>
        <p style={styles.helperText}>
          {faceMode === "mark"
            ? "Mark check-in at 10:00 AM and check-out at 6:00 PM to track daily working hours."
            : "Capture 3 clear front-facing photos to register biometric attendance."}
        </p>
        <div style={styles.faceGrid}>
          <div style={styles.webcamWrap}>
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.7}
              width={360}
              height={260}
              videoConstraints={{ facingMode: "user" }}
              style={styles.webcam}
            />
          </div>
          <div style={styles.faceActions}>
            {faceMode === "mark" ? (
              <>
                <button
                  type="button"
                  style={styles.enrollButton}
                  onClick={() => handleFacePunch("checkin")}
                  disabled={processingAttendance}
                >
                  {processingAttendance ? "Marking..." : "Mark Check-In (10:00 AM)"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleFacePunch("checkout")}
                  disabled={processingAttendance}
                >
                  {processingAttendance ? "Marking..." : "Mark Check-Out (6:00 PM)"}
                </button>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => setFaceMode("enroll")}
                  disabled={processingAttendance}
                >
                  Edit Face Data
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={captureEnrollPhoto}
                  disabled={enrolling || capturedEnrollImages.length >= 3}
                >
                  {capturedEnrollImages.length >= 3 ? "3 Photos Captured" : "Capture Photo"}
                </button>
                <div style={styles.captureStatus}>
                  Captured: {capturedEnrollImages.length}/3
                </div>
                {capturedEnrollImages.length > 0 && (
                  <div style={styles.previewGrid}>
                    {capturedEnrollImages.map((img, idx) => (
                      <div key={`face-${idx}`} style={styles.previewCard}>
                        <img src={img} alt={`Face ${idx + 1}`} style={styles.previewImage} />
                        <button
                          type="button"
                          style={styles.previewRemove}
                          onClick={() => removeEnrollPhoto(idx)}
                          disabled={enrolling}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" style={styles.enrollButton} onClick={handleFaceEnroll} disabled={enrolling}>
                  {enrolling ? "Registering..." : (profile?.faceEnrolled ? "Update Face Data (3 Photos)" : "Register Face (3 Photos)")}
                </button>
                {capturedEnrollImages.length > 0 && (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={resetEnrollPhotos}
                    disabled={enrolling}
                  >
                    Reset Captures
                  </button>
                )}
                {profile?.faceEnrolled && (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setFaceMode("mark")}
                    disabled={enrolling}
                  >
                    Back To Attendance
                  </button>
                )}
              </>
            )}
            {actionMessage && <div style={styles.enrollMessage}>{actionMessage}</div>}
            {!profile?.faceEnrolled && (
              <div style={styles.tipBox}>Tip: Capture 3 photos with slightly different angles for better matching accuracy.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    background: "#fdeff5",
    border: "1px solid #f5d4e4",
    borderRadius: 14,
    padding: 18,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: "#8b2557",
    fontWeight: 700,
  },
  subtitle: {
    margin: "4px 0 0 0",
    color: "#9d4b70",
    fontSize: 14,
  },
  badge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "#f8d8e7",
    border: "1px solid #e8aeca",
    color: "#8b2557",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fff8fc",
    border: "1px solid #f2c9dc",
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    marginTop: 0,
    marginBottom: 10,
    color: "#8b2557",
    fontSize: 16,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    border: "1px solid #f4d8e4",
    borderRadius: 10,
    background: "#ffffff",
    padding: "10px 12px",
  },
  label: {
    color: "#9d4b70",
    fontSize: 13,
    fontWeight: 600,
  },
  value: {
    color: "#521637",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
  },
  loadingCard: {
    border: "1px solid #f2c9dc",
    borderRadius: 12,
    padding: 14,
    background: "#fff8fc",
    color: "#8b2557",
    fontWeight: 600,
  },
  errorCard: {
    border: "1px solid #f5b3c8",
    borderRadius: 12,
    padding: 14,
    background: "#fff2f6",
    color: "#9f1239",
    fontWeight: 600,
  },
  helperText: {
    margin: "0 0 12px 0",
    color: "#9d4b70",
    fontSize: 13,
  },
  faceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
    alignItems: "start",
  },
  webcamWrap: {
    border: "1px solid #f2c9dc",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    width: "100%",
    maxWidth: 360,
  },
  webcam: {
    width: "100%",
    height: "auto",
    display: "block",
  },
  faceActions: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  enrollButton: {
    width: 170,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #c53876",
    background: "#c53876",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    width: 170,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #d8a8bf",
    background: "#fff",
    color: "#8b2557",
    fontWeight: 700,
    cursor: "pointer",
  },
  enrollMessage: {
    border: "1px solid #f2c9dc",
    borderRadius: 10,
    background: "#fff8fc",
    color: "#8b2557",
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 600,
    maxWidth: 420,
  },
  captureStatus: {
    color: "#8b2557",
    fontSize: 13,
    fontWeight: 700,
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 8,
    maxWidth: 460,
  },
  previewCard: {
    border: "1px solid #f2c9dc",
    borderRadius: 10,
    overflow: "hidden",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
  },
  previewImage: {
    width: "100%",
    height: 90,
    objectFit: "cover",
    display: "block",
  },
  previewRemove: {
    border: "none",
    borderTop: "1px solid #f2c9dc",
    background: "#fff8fc",
    color: "#8b2557",
    fontWeight: 700,
    fontSize: 12,
    padding: "6px 8px",
    cursor: "pointer",
  },
  tipBox: {
    border: "1px dashed #e8aeca",
    borderRadius: 10,
    background: "#fff7fb",
    color: "#9d4b70",
    padding: "10px 12px",
    fontSize: 12,
    maxWidth: 460,
  },
};
