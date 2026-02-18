import React, { createContext, useContext, useEffect, useState } from 'react';
import { decodeToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const init = async () => {
      if (token) {
        localStorage.setItem('token', token);
        // try to fetch profile from backend
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setPayload(data);
            return;
          }
        } catch (err) {
          // ignore and fallback to decode
        }

        // fallback: decode token for role/id
        setPayload(decodeToken(token));
      } else {
        localStorage.removeItem('token');
        setPayload(null);
      }
    };

    init();
  }, [token]);

  const logout = () => setToken(null);

  return (
    <AuthContext.Provider value={{ token, setToken, payload, role: payload?.role || null, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
