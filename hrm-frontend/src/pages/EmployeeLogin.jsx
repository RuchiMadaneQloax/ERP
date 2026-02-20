import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginEmployee } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginEmployee({ email, password });
      if (res?.token) {
        setToken(res.token);
        navigate('/employee');
        return;
      }
      alert(res?.message || 'Login failed');
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
    setLoading(false);
  };

  return (
    <div style={{padding:24}}>
      <h2>Employee Login</h2>
      <form onSubmit={submit} style={{maxWidth:420}}>
        <div style={{marginBottom:8}}>
          <label>Email</label>
          <input value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:8}} />
        </div>
        <div style={{marginBottom:8}}>
          <label>Password</label>
          <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} style={{width:'100%',padding:8}} />
        </div>
        <button type="submit" disabled={loading} style={{padding:'8px 12px'}}>{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
    </div>
  );
}
