import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Webcam from "react-webcam";
import { getMyAttendance, getMyLeaves, markAttendanceByFace } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AttendanceCalendar from '../../components/AttendanceCalendar';

export default function MyAttendance() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveToken = token ?? localStorage.getItem('token');
  const [rows, setRows] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showMarkedMessage, setShowMarkedMessage] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [processingAttendance, setProcessingAttendance] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const webcamRef = useRef(null);

  const toIstDateKey = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return y && m && day ? `${y}-${m}-${day}` : '';
  };

  const loadAttendance = async () => {
    const [attendanceData, leaveData] = await Promise.all([
      getMyAttendance(effectiveToken),
      getMyLeaves(effectiveToken),
    ]);
    const list = Array.isArray(attendanceData) ? attendanceData : [];
    setRows(list);
    setLeaves(Array.isArray(leaveData) ? leaveData : []);
    const todayKey = toIstDateKey(new Date());
    setTodayAttendance(list.find((r) => toIstDateKey(r?.date) === todayKey) || null);
  };

  useEffect(() => {
    if (effectiveToken) loadAttendance();
  }, [effectiveToken]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromRedirect = params.get('marked') === '1';
    setShowMarkedMessage(fromRedirect || Boolean(todayAttendance?.checkInTime));
  }, [location.search, todayAttendance]);

  const isCheckedOutToday = Boolean(todayAttendance?.checkOutTime);
  const hasCheckedInToday = Boolean(todayAttendance?.checkInTime);

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
      setShowMarkedMessage(true);
      await loadAttendance();
    } catch (err) {
      setActionMessage(err?.message || "Attendance marking failed");
    } finally {
      setProcessingAttendance(false);
    }
  };

  return (
    <div style={styles.section}>
      <div style={styles.headerRow}>
        <div style={styles.titleRow}>
          <h3 style={styles.title}>My Attendance</h3>
          {showMarkedMessage ? (
            <span style={styles.successInline}>Attendance marked for today.</span>
          ) : null}
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => navigate('/employee/profile')}>
          Manage Face Data
        </button>
      </div>
      <div style={styles.markPanel}>
        <div style={styles.webcamWrap}>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.7}
            width={320}
            height={220}
            videoConstraints={{ facingMode: "user" }}
            style={styles.webcam}
          />
        </div>
        <div style={styles.actionCol}>
          <button
            type="button"
            style={{
              ...styles.markButton,
              ...((hasCheckedInToday || isCheckedOutToday) ? styles.markButtonDisabled : {}),
            }}
            onClick={() => handleFacePunch("checkin")}
            disabled={processingAttendance || hasCheckedInToday || isCheckedOutToday}
          >
            {processingAttendance ? "Marking..." : "Mark Check-In"}
          </button>
          <button
            type="button"
            style={{
              ...styles.markButton,
              ...((!hasCheckedInToday || isCheckedOutToday) ? styles.markButtonDisabled : {}),
            }}
            onClick={() => handleFacePunch("checkout")}
            disabled={processingAttendance || !hasCheckedInToday || isCheckedOutToday}
          >
            {processingAttendance ? "Marking..." : "Mark Check-Out"}
          </button>
          {actionMessage ? <div style={styles.infoText}>{actionMessage}</div> : null}
        </div>
      </div>
      {rows.length === 0 && leaves.length === 0 ? (
        <div style={styles.empty}>No attendance records.</div>
      ) : null}
      <AttendanceCalendar
        title="Attendance Calendar"
        attendanceRecords={rows}
        leaveRequests={leaves}
      />
    </div>
  );
}

const styles = {
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  markPanel: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    border: '1px solid #dfd0f2',
    borderRadius: 10,
    background: '#f7f2fc',
    padding: 10,
  },
  webcamWrap: {
    border: '1px solid #dfd0f2',
    borderRadius: 10,
    overflow: 'hidden',
    background: '#fff',
  },
  webcam: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  actionCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minWidth: 180,
  },
  title: { margin: 0, color: '#4b316c', fontSize: 20 },
  markButton: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #6f4a99',
    background: '#6f4a99',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  markButtonDisabled: {
    border: '1px solid #9ca3af',
    background: '#e5e7eb',
    color: '#6b7280',
    cursor: 'not-allowed',
  },
  secondaryButton: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    color: '#374151',
    cursor: 'pointer',
    fontWeight: 700,
  },
  successInline: {
    color: '#166534',
    fontWeight: 700,
    fontSize: 14,
  },
  infoText: {
    padding: 10,
    borderRadius: 8,
    border: '1px solid #dfd0f2',
    background: '#fff',
    color: '#4b316c',
    fontSize: 13,
    fontWeight: 600,
    maxWidth: 360,
  },
  empty: { padding: 12, background: '#f7f2fc', border: '1px solid #dfd0f2', borderRadius: 10, color: '#6a5880' },
};
