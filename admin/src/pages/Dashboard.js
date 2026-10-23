import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Dashboard() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchEmergencies = async () => {
    try {
      const res = await api.get('/api/emergencies');
      setEmergencies(res.data.data.emergencies || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load emergencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('authToken')) {
      navigate('/login');
      return;
    }
    fetchEmergencies();
    const timer = setInterval(fetchEmergencies, 10000);
    return () => clearInterval(timer);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.patch(`/api/emergencies/${id}/status`, { status });
      fetchEmergencies();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update status');
    }
  };

  const filtered = emergencies.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>🚨 Emergency Response Dashboard</h1>
          <p style={styles.headerUser}>
            Logged in as: <strong>{user.name || user.email}</strong> ({user.role})
          </p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Sign Out
        </button>
      </header>

      <main style={styles.main}>
        <div style={styles.filterRow}>
          <div style={styles.filters}>
            {['all', 'pending', 'acknowledged', 'assigned', 'responding', 'resolved', 'cancelled'].map((st) => (
              <button
                key={st}
                style={{
                  ...styles.filterBtn,
                  ...(filter === st ? styles.filterBtnActive : {}),
                }}
                onClick={() => setFilter(st)}
              >
                {st.toUpperCase()}
              </button>
            ))}
          </div>
          <button style={styles.refreshBtn} onClick={fetchEmergencies}>
            🔄 Refresh
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {loading ? (
          <p style={{ textAlign: 'center', marginTop: 40 }}>Loading incidents...</p>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>No emergency reports matching this filter.</div>
        ) : (
          <div style={styles.grid}>
            {filtered.map((e) => (
              <div key={e.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.typeBadge}>{e.type.replace('_', ' ').toUpperCase()}</span>
                  <span style={{ ...styles.statusBadge, ...getStatusStyle(e.status) }}>
                    {e.status.toUpperCase()}
                  </span>
                </div>

                <p style={styles.date}>
                  Reported: {new Date(e.createdAt).toLocaleString()}
                </p>

                {e.description && <p style={styles.desc}>{e.description}</p>}

                {e.citizen && (
                  <div style={styles.infoBox}>
                    <strong>Citizen:</strong> {e.citizen.name} · {e.citizen.phone || 'No phone'}
                    {e.citizen.emergencyContactName && (
                      <div style={styles.ecText}>
                        🚨 Emergency Contact: {e.citizen.emergencyContactName} ({e.citizen.emergencyContactPhone || 'No phone'})
                      </div>
                    )}
                  </div>
                )}

                {e.location && (
                  <div style={styles.infoBox}>
                    <strong>Location:</strong>{' '}
                    {e.location.latitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${e.location.latitude},${e.location.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.mapLink}
                      >
                        {e.location.latitude.toFixed(5)}, {e.location.longitude.toFixed(5)} (Open Map)
                      </a>
                    ) : (
                      e.location.manualDescription || 'Location not specified'
                    )}
                  </div>
                )}

                {/* Status action controls */}
                <div style={styles.actions}>
                  {e.status === 'pending' && (
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleUpdateStatus(e.id, 'acknowledged')}
                    >
                      Acknowledge
                    </button>
                  )}
                  {e.status === 'acknowledged' && (
                    <button
                      style={styles.actionBtn}
                      onClick={() => handleUpdateStatus(e.id, 'responding')}
                    >
                      Responding
                    </button>
                  )}
                  {e.status === 'responding' && (
                    <button
                      style={{ ...styles.actionBtn, backgroundColor: '#16a34a' }}
                      onClick={() => handleUpdateStatus(e.id, 'resolved')}
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case 'pending': return { backgroundColor: '#fef3c7', color: '#b45309' };
    case 'acknowledged': return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
    case 'assigned': return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
    case 'responding': return { backgroundColor: '#cffafe', color: '#0e7490' };
    case 'resolved': return { backgroundColor: '#dcfce7', color: '#15803d' };
    case 'cancelled': return { backgroundColor: '#f1f5f9', color: '#475569' };
    default: return {};
  }
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' },
  header: {
    backgroundColor: '#0f172a', color: '#fff', padding: '16px 32px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitle: { margin: 0, fontSize: 20 },
  headerUser: { margin: '4px 0 0', fontSize: 13, color: '#94a3b8' },
  logoutBtn: {
    backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px',
    borderRadius: 6, cursor: 'pointer', fontWeight: 600,
  },
  main: { padding: 32, maxWidth: 1200, margin: '0 auto' },
  filterRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  filterBtn: {
    backgroundColor: '#e2e8f0', border: 'none', padding: '6px 12px',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#334155',
  },
  filterBtnActive: { backgroundColor: '#0f172a', color: '#fff' },
  refreshBtn: {
    backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px',
    borderRadius: 6, cursor: 'pointer', fontWeight: 600,
  },
  error: { backgroundColor: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 6, marginBottom: 16 },
  empty: { textAlign: 'center', padding: 48, color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { fontWeight: 800, fontSize: 13, color: '#0f172a' },
  statusBadge: { padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 },
  date: { fontSize: 12, color: '#64748b', margin: '4px 0 10px' },
  desc: { fontSize: 14, color: '#1e293b', marginBottom: 12, lineHeight: 1.4 },
  infoBox: { fontSize: 13, color: '#334155', backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, marginBottom: 8 },
  ecText: { marginTop: 4, color: '#b91c1c', fontWeight: 600 },
  mapLink: { color: '#2563eb', fontWeight: 600, textDecoration: 'none' },
  actions: { display: 'flex', gap: 8, marginTop: 14 },
  actionBtn: {
    backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px',
    borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
  },
};
