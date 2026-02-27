import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const EMPLOYEE_DEFAULT_PASSWORD = "ChangeMe123";

export default function Login() {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const apiRoot = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
  const baseUrl = apiRoot.endsWith("/api") ? apiRoot : `${apiRoot}/api`;

  const [activeSlide, setActiveSlide] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: "",
  });
  const [employeeForm, setEmployeeForm] = useState({
    email: "",
    password: EMPLOYEE_DEFAULT_PASSWORD,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleAdminChange = (e) => {
    setAdminForm({
      ...adminForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleEmployeeChange = (e) => {
    setEmployeeForm({
      ...employeeForm,
      [e.target.name]: e.target.value,
    });
  };

  const validate = (formData) => {
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
    const formData = activeSlide === "admin" ? adminForm : employeeForm;

    const validationErrors = validate(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length !== 0) return;

    try {
      setLoading(true);
      const endpoint =
        activeSlide === "admin"
          ? `${baseUrl}/auth/login`
          : `${baseUrl}/employee-auth/login`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ password: data.message || "Login failed" });
        return;
      }

      // store token in central AuthContext
      setToken(data.token);

      navigate(activeSlide === "admin" ? "/" : "/employee");

    } catch {
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

        <div style={styles.slideSwitcher}>
          <button
            type="button"
            style={{
              ...styles.slideButton,
              ...(activeSlide === "admin" ? styles.slideButtonActive : {}),
            }}
            onClick={() => {
              setActiveSlide("admin");
              setErrors({});
            }}
          >
            Admin Login
          </button>
          <button
            type="button"
            style={{
              ...styles.slideButton,
              ...(activeSlide === "employee" ? styles.slideButtonActive : {}),
            }}
            onClick={() => {
              setActiveSlide("employee");
              setErrors({});
            }}
          >
            Employee Login
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.slideViewport}>
            <div
              style={{
                ...styles.slideTrack,
                transform:
                  activeSlide === "admin"
                    ? "translateX(0%)"
                    : "translateX(-50%)",
              }}
            >
              <div style={styles.slide}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="text"
                    name="email"
                    value={adminForm.email}
                    onChange={handleAdminChange}
                    style={styles.input}
                    placeholder="admin@company.com"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.passwordWrap}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={adminForm.password}
                      onChange={handleAdminChange}
                      style={styles.input}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.slide}>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Employee Email</label>
                  <input
                    type="text"
                    name="email"
                    value={employeeForm.email}
                    onChange={handleEmployeeChange}
                    style={styles.input}
                    placeholder="employee@company.com"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Password</label>
                  <div style={styles.passwordWrap}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={employeeForm.password}
                      onChange={handleEmployeeChange}
                      style={styles.input}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={styles.hint}>
                  Default employee password is {EMPLOYEE_DEFAULT_PASSWORD}
                </div>
              </div>
            </div>
          </div>

          {errors.email && <div style={styles.error}>{errors.email}</div>}
          {errors.password && <div style={styles.error}>{errors.password}</div>}

          <button type="submit" disabled={loading} style={styles.submit}>
            {loading
              ? "Logging in..."
              : activeSlide === "admin"
                ? "Login as Admin"
                : "Login as Employee"}
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
    background: 'linear-gradient(160deg, #2d2238 0%, #3b2a4c 45%, #4a345f 100%)',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 500,
    background: '#1f1829',
    borderRadius: 14,
    padding: 28,
    boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
    border: '1px solid #5d4675'
  },
  header: { textAlign: 'center', marginBottom: 18 },
  brand: { fontSize: 22, fontWeight: 800, color: '#f1e6ff' },
  brandSubtitle: { fontSize: 12, color: '#c7b3dc', marginTop: 6 },
  slideSwitcher: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 14,
  },
  slideButton: {
    border: "1px solid #6f5a87",
    borderRadius: 10,
    background: "#2a2035",
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 600,
    color: "#e3d4f3",
  },
  slideButtonActive: {
    background: "#9b7bc5",
    color: "#1f1829",
    borderColor: "#9b7bc5",
  },
  form: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 },
  slideViewport: { overflow: "hidden", width: "100%" },
  slideTrack: {
    width: "200%",
    display: "flex",
    transition: "transform 240ms ease",
  },
  slide: {
    width: "50%",
    boxSizing: "border-box",
    padding: "0 6px",
  },
  fieldGroup: { marginBottom: 12 },
  label: { display: "block", fontSize: 13, color: '#d8c7eb', marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", padding: '10px 12px', borderRadius: 10, border: '1px solid #70598a', background: '#2b2237', color: '#f6eeff', outline: 'none' },
  passwordWrap: { position: "relative" },
  eyeButton: { position: 'absolute', right: 8, top: "50%", transform: "translateY(-50%)", border: 'none', background: 'transparent', cursor: 'pointer', color: '#d8c7eb' },
  submit: { marginTop: 12, padding: '10px 14px', borderRadius: 10, border: 'none', background: '#b596db', color: '#1f1829', fontWeight: 700, cursor: 'pointer' },
  hint: { fontSize: 12, color: "#bca7d6", marginTop: 6 },
  error: { color: '#dc2626', fontSize: 12, marginTop: 6 }
};
