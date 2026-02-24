import { useMemo, useState } from "react";

function toDateKey(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !day) return "";
  return `${y}-${m}-${day}`;
}

function monthStringToMeta(monthString) {
  const [y, m] = monthString.split("-").map(Number);
  return { year: y, monthIndex: m - 1 };
}

function getMonthStringFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthString, delta) {
  const { year, monthIndex } = monthStringToMeta(monthString);
  const d = new Date(year, monthIndex + delta, 1);
  return getMonthStringFromDate(d);
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_META = {
  present: { label: "Present", short: "P", bg: "#dcfce7", color: "#166534", border: "#86efac" },
  absent: { label: "Absent", short: "A", bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  "half-day": { label: "Half Day", short: "HD", bg: "#fff7d6", color: "#854d0e", border: "#fde68a" },
  leave: { label: "Leave", short: "L", bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  holiday: { label: "Holiday", short: "H", bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  none: { label: "No Record", short: "", bg: "#ffffff", color: "#6b7280", border: "#e5e7eb" },
};

export default function AttendanceCalendar({
  attendanceRecords = [],
  leaveRequests = [],
  initialMonth,
  title = "Attendance Calendar",
}) {
  const [month, setMonth] = useState(() => initialMonth || getMonthStringFromDate(new Date()));

  const { year, monthIndex } = monthStringToMeta(month);
  const monthStart = new Date(year, monthIndex, 1);
  const firstWeekDay = monthStart.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const row of attendanceRecords) {
      const key = toDateKey(row?.date);
      if (!key) continue;
      map.set(key, row);
    }
    return map;
  }, [attendanceRecords]);

  const leaveMap = useMemo(() => {
    const map = new Map();
    for (const leave of leaveRequests) {
      const status = String(leave?.status || "").toLowerCase();
      if (status === "rejected") continue;

      const start = new Date(leave?.startDate);
      const end = new Date(leave?.endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;

      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= endLocal) {
        map.set(toDateKey(cursor), leave);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [leaveRequests]);

  const monthCells = [];
  for (let i = 0; i < firstWeekDay; i++) monthCells.push(null);
  for (let day = 1; day <= daysInMonth; day++) monthCells.push(day);
  while (monthCells.length % 7 !== 0) monthCells.push(null);

  const getDayMeta = (day) => {
    if (!day) return STATUS_META.none;
    const key = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const attendance = attendanceMap.get(key);
    const leave = leaveMap.get(key);

    if (attendance?.isHoliday) return STATUS_META.holiday;
    if (leave) return STATUS_META.leave;
    if (attendance?.status && STATUS_META[attendance.status]) return STATUS_META[attendance.status];
    return STATUS_META.none;
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h4 style={styles.title}>{title}</h4>
        <div style={styles.controls}>
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} style={styles.navButton}>
            Prev
          </button>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={styles.monthInput} />
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} style={styles.navButton}>
            Next
          </button>
        </div>
      </div>

      <div style={styles.grid}>
        {WEEK_DAYS.map((d) => (
          <div key={d} style={styles.weekHead}>{d}</div>
        ))}

        {monthCells.map((day, idx) => {
          const meta = getDayMeta(day);
          return (
            <div
              key={`${month}-${idx}`}
              style={{
                ...styles.cell,
                background: meta.bg,
                color: meta.color,
                borderColor: meta.border,
                opacity: day ? 1 : 0.35,
              }}
              title={day ? `${day}: ${meta.label}` : ""}
            >
              {day ? (
                <>
                  <div style={styles.dayNumber}>{day}</div>
                  <div style={styles.dayTag}>{meta.short}</div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        {["present", "absent", "half-day", "leave", "holiday"].map((k) => (
          <div key={k} style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: STATUS_META[k].bg, borderColor: STATUS_META[k].border }} />
            <span>{STATUS_META[k].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 14, fontWeight: 700, color: "#374151" },
  controls: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  navButton: {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  monthInput: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "6px 8px",
    background: "#fff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0,1fr))",
    gap: 6,
  },
  weekHead: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: 700,
    color: "#6b7280",
    paddingBottom: 4,
  },
  cell: {
    minHeight: 58,
    border: "1px solid",
    borderRadius: 8,
    padding: 6,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  dayNumber: { fontSize: 12, fontWeight: 700 },
  dayTag: { fontSize: 10, fontWeight: 700, alignSelf: "flex-end" },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
    fontSize: 12,
    color: "#4b5563",
  },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 999, border: "1px solid" },
};
