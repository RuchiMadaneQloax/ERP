import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

export default function Login({ setToken }) {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validate = () => {
    let newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length !== 0) return;

    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setErrors({ password: data.message || "Login failed" });
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);

      navigate("/");

    } catch (error) {
      setErrors({ password: "Server error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brand}>ERP HRMS</div>
          <div style={styles.brandSubtitle}>Enterprise HR Management</div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="text"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            placeholder="you@example.com"
          />
          {errors.email && <div style={styles.error}>{errors.email}</div>}

          <label style={{...styles.label, marginTop:12}}>Password</label>
          <div style={{position:'relative'}}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <div style={styles.error}>{errors.password}</div>}

          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#efe6da' /* light brown */,
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#F7F6F3',
    borderRadius: 14,
    padding: 28,
    boxShadow: '0 8px 30px rgba(16,24,40,0.08)',
    border: '1px solid rgba(0,0,0,0.03)'
  },
  header: { textAlign: 'center', marginBottom: 18 },
  brand: { fontSize: 22, fontWeight: 800, color: '#24492f' },
  brandSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 },
  label: { fontSize: 13, color: '#374151', marginBottom: 6 },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', outline: 'none' },
  eyeButton: { position: 'absolute', right: 8, top: 8, border: 'none', background: 'transparent', cursor: 'pointer' },
  submit: { marginTop: 12, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#355E3B', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 12, marginTop: 6 }
};
