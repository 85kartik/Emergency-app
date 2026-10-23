import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { token, user } = res.data.data;
      if (user.role !== 'admin' && user.role !== 'responder') {
        setError('Access restricted to admin and responders');
        setLoading(false);
        return;
      }
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h1 style={styles.title}>Admin / Responder Login</h1>
        {error && <p style={styles.error}>{error}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
  },
  form: {
    background: '#fff',
    padding: 32,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    width: 360,
  },
  title: { marginBottom: 24, color: '#0f172a', fontSize: 22 },
  input: {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 15,
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: 14,
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#dc2626', marginBottom: 12 },
};
