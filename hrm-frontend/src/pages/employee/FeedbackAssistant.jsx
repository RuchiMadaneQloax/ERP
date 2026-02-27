import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { chatMyFeedback, getMyFeedbackHistory, submitMyReview } from "../../services/api";

function fmt(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function FeedbackAssistant() {
  const { token } = useAuth();
  const effectiveToken = token ?? localStorage.getItem("token");
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(5);
  const [loadingChat, setLoadingChat] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

  const loadHistory = async () => {
    const rows = await getMyFeedbackHistory(effectiveToken);
    setHistory(Array.isArray(rows) ? rows : []);
  };

  useEffect(() => {
    if (effectiveToken) loadHistory();
  }, [effectiveToken]);

  const sendChat = async () => {
    const text = String(message || "").trim();
    if (!text) return;
    try {
      setLoadingChat(true);
      const res = await chatMyFeedback(text, effectiveToken);
      setHistory((prev) => [{ ...res }, ...prev]);
      setMessage("");
    } catch (err) {
      alert(err?.message || "Could not send message");
    } finally {
      setLoadingChat(false);
    }
  };

  const submitReview = async () => {
    const text = String(review || "").trim();
    if (!text) return alert("Please enter review text");
    try {
      setLoadingReview(true);
      const res = await submitMyReview(text, Number(rating), effectiveToken);
      setHistory((prev) => [{ ...res }, ...prev]);
      setReview("");
      setRating(5);
      alert("Review submitted");
    } catch (err) {
      alert(err?.message || "Could not submit review");
    } finally {
      setLoadingReview(false);
    }
  };

  return (
    <div style={styles.page}>
      <h3 style={{ margin: 0 }}>AI Feedback Assistant</h3>
      <p style={styles.sub}>Share issues, suggestions, and reviews. The assistant logs your feedback for HR/admin.</p>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h4 style={styles.title}>Chat</h4>
          <div style={styles.row}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your feedback or concern..."
              style={styles.textarea}
            />
            <button style={styles.primary} onClick={sendChat} disabled={loadingChat}>
              {loadingChat ? "Sending..." : "Send"}
            </button>
          </div>
        </section>

        <section style={styles.card}>
          <h4 style={styles.title}>Submit Review</h4>
          <div style={styles.row}>
            <select value={rating} onChange={(e) => setRating(e.target.value)} style={styles.input}>
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{r} Star</option>
              ))}
            </select>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write your overall experience..."
              style={styles.textarea}
            />
            <button style={styles.primary} onClick={submitReview} disabled={loadingReview}>
              {loadingReview ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </section>
      </div>

      <section style={styles.card}>
        <h4 style={styles.title}>History</h4>
        {history.length === 0 ? (
          <div style={styles.empty}>No feedback yet.</div>
        ) : (
          <div style={styles.historyList}>
            {history.map((h, idx) => (
              <div key={`${h._id || idx}`} style={styles.item}>
                <div style={styles.meta}>{String(h.kind || "").toUpperCase()} • {fmt(h.createdAt)}</div>
                <div style={styles.msg}><strong>You:</strong> {h.message}</div>
                {h.rating ? <div style={styles.msg}><strong>Rating:</strong> {h.rating}/5</div> : null}
                {h.botReply ? <div style={styles.reply}><strong>AI:</strong> {h.botReply}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  page: { display: "flex", flexDirection: "column", gap: 12 },
  sub: { margin: 0, color: "#6b7280", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  card: { border: "1px solid #decff1", background: "#faf7ff", borderRadius: 12, padding: 12 },
  title: { margin: "0 0 8px 0", color: "#4b316c" },
  row: { display: "grid", gap: 8 },
  textarea: { minHeight: 88, border: "1px solid #d7c5ef", borderRadius: 8, padding: 10, resize: "vertical" },
  input: { border: "1px solid #d7c5ef", borderRadius: 8, padding: 8 },
  primary: { border: "1px solid #d9c8f6", background: "#f3ecff", color: "#3f2a5f", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  empty: { padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", color: "#6b7280" },
  historyList: { display: "grid", gap: 8 },
  item: { border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", padding: 10 },
  meta: { fontSize: 11, color: "#6b7280", marginBottom: 6 },
  msg: { fontSize: 13, color: "#111827", marginBottom: 4 },
  reply: { fontSize: 13, color: "#4b316c" },
};
