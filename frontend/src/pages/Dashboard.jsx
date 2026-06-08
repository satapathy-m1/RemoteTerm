import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      setSessions(res.data.sessions);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const handleNewSession = async () => {
    setShowModal(true);
    setLoadingCode(true);
    setCode('');
    try {
      const res = await api.post('/sessions/generate-code');
      setCode(res.data.code);
      setCodeExpiry(new Date(res.data.expiresAt));
    } catch (err) {
      console.error('Failed to generate code:', err);
    } finally {
      setLoadingCode(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>RemoteTerm</h1>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleNewSession} className="btn-primary btn-sm">
            + New Session
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {sessions.length === 0 ? (
          <div className="empty-state">
            <h2>No sessions yet</h2>
            <p>Click <strong>+ New Session</strong> to start streaming your terminal.</p>
          </div>
        ) : (
          <div className="sessions-grid">
            {sessions.map(session => (
              <div
                key={session.id}
                className={`session-card ${session.status === 'active' ? 'active' : ''}`}
                onClick={() => navigate(`/session/${session.id}`)}
              >
                <div className="session-card-header">
                  <span className={`status-dot ${session.status}`} />
                  <span className="machine-name">
                    {session.machine_name || 'Unknown machine'}
                  </span>
                </div>
                <div className="session-meta">
                  {new Date(session.started_at).toLocaleString()}
                </div>
                <div className="session-status-label">{session.status}</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>New Session</h2>
            <p>Run this command on your machine, then paste the code below:</p>
            <div className="code-block">remoterm connect</div>
            {loadingCode ? (
              <p className="code-loading">Generating code...</p>
            ) : (
              <>
                <div className="one-time-code">{code}</div>
                <p className="code-hint">
                  Expires at {codeExpiry?.toLocaleTimeString()}. Paste this when prompted.
                </p>
              </>
            )}
            <button className="btn-secondary" onClick={() => setShowModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}