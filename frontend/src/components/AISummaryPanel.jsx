export default function AISummaryPanel({ summary, timestamp }) {
  if (!summary) {
    return (
      <div className="ai-panel ai-panel-empty">
        <div className="ai-panel-header">
          <span className="ai-icon">✦</span>
          <span>AI Summary</span>
        </div>
        <p className="ai-waiting">
          Summary will appear here after 60 seconds of terminal activity...
        </p>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-icon">✦</span>
        <span>AI Summary</span>
        {timestamp && (
          <span className="ai-timestamp">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
      <p className="ai-summary-text">{summary}</p>
    </div>
  );
}