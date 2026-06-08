import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TerminalViewer from '../components/TerminalViewer';
import AISummaryPanel from '../components/AISummaryPanel';

export default function SessionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('connecting');
  const [summary, setSummary] = useState('');
  const [summaryTime, setSummaryTime] = useState(null);
  const token = localStorage.getItem('token');

  const statusColors = {
    connected: '#4caf50',
    waiting: '#ff9800',
    ended: '#f44336',
    disconnected: '#f44336',
    connecting: '#4a9eff',
  };

  const handleMessage = (msg) => {
    if (msg.type === 'ai_summary') {
      setSummary(msg.summary);
      setSummaryTime(msg.timestamp);
    } else if (msg.type === 'session_status') {
      setStatus(msg.status);
    }
  };

  return (
    <div className="session-view">
      <header className="session-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="session-info">
          <span className="session-id-label">Session {id.slice(0, 8)}...</span>
          <span
            className="status-badge"
            style={{ backgroundColor: statusColors[status] || '#888' }}
          >
            {status}
          </span>
        </div>
      </header>

      <div className="session-body">
        <div className="terminal-container">
          <TerminalViewer
            sessionId={id}
            token={token}
            onMessage={handleMessage}
          />
        </div>
        <AISummaryPanel summary={summary} timestamp={summaryTime} />
      </div>
    </div>
  );
}