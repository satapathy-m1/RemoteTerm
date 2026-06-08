import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
import { summarizeSession } from '../ai/summarizer.js';

const agentConnections = new Map();
const browserConnections = new Map();

// Rolling line buffer per session: sessionId -> string[]
const lineBuffers = new Map();

// Summary timers per session: sessionId -> timer
const summaryTimers = new Map();

export function setupWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (pathname === '/ws/agent') {
      handleAgentConnection(ws, url);
    } else if (pathname === '/ws/browser') {
      handleBrowserConnection(ws, url);
    } else {
      ws.close(4004, 'Unknown endpoint');
    }
  });

  console.log('WebSocket server ready');
}

// ─── Line Buffer ─────────────────────────────────────────────────────────────

function appendToBuffer(sessionId, data) {
  if (!lineBuffers.has(sessionId)) {
    lineBuffers.set(sessionId, []);
  }
  const buf = lineBuffers.get(sessionId);
  const newLines = data.split('\n');
  buf.push(...newLines);

  // Keep only last 100 lines
  if (buf.length > 100) {
    lineBuffers.set(sessionId, buf.slice(-100));
  }
}

function getBuffer(sessionId) {
  return lineBuffers.get(sessionId) || [];
}

function clearBuffer(sessionId) {
  lineBuffers.delete(sessionId);
}

// ─── Summary Timer ────────────────────────────────────────────────────────────

function startSummaryTimer(sessionId) {
  // Clear any existing timer
  stopSummaryTimer(sessionId);

  const timer = setInterval(async () => {
    const lines = getBuffer(sessionId);
    if (lines.length === 0) return;

    const summary = await summarizeSession(sessionId, lines);
    if (summary) {
      broadcastToBrowsers(sessionId, {
        type: 'ai_summary',
        sessionId,
        summary,
        timestamp: new Date().toISOString(),
      });
    }
  }, 60000); // every 60 seconds

  summaryTimers.set(sessionId, timer);
  console.log(`[AI] Summary timer started for session ${sessionId}`);
}

function stopSummaryTimer(sessionId) {
  const timer = summaryTimers.get(sessionId);
  if (timer) {
    clearInterval(timer);
    summaryTimers.delete(sessionId);
  }
}

// ─── Agent Connection ─────────────────────────────────────────────────────────

function handleAgentConnection(ws, url) {
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'No token provided');
    return;
  }

  let sessionId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    sessionId = decoded.sessionId;
  } catch {
    ws.close(4001, 'Invalid token');
    return;
  }

  console.log(`[WS] Agent connected for session ${sessionId}`);
  agentConnections.set(sessionId, ws);

  pool.query(
    'UPDATE sessions SET status = $1, last_ping_at = NOW() WHERE id = $2',
    ['active', sessionId]
  ).catch(err => console.error('DB update error:', err));

  broadcastToBrowsers(sessionId, {
    type: 'session_status',
    sessionId,
    status: 'connected',
  });

  // Start AI summary timer
  startSummaryTimer(sessionId);

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      handleAgentMessage(sessionId, msg, ws);
    } catch {
      console.error('[WS] Invalid agent message');
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Agent disconnected for session ${sessionId}`);
    agentConnections.delete(sessionId);
    stopSummaryTimer(sessionId);
    clearBuffer(sessionId);

    pool.query(
      'UPDATE sessions SET status = $1, ended_at = NOW() WHERE id = $2',
      ['ended', sessionId]
    ).catch(err => console.error('DB update error:', err));

    broadcastToBrowsers(sessionId, {
      type: 'session_status',
      sessionId,
      status: 'ended',
    });
  });

  ws.on('error', (err) => {
    console.error(`[WS] Agent error:`, err.message);
  });
}

function handleAgentMessage(sessionId, msg, ws) {
  switch (msg.type) {
    case 'terminal_output':
      // Add to rolling buffer
      const cleanData = msg.data.replace(/\x00/g, '');

      appendToBuffer(sessionId, cleanData);

      pool.query(
          'INSERT INTO terminal_logs (session_id, data) VALUES ($1, $2)',
          [sessionId, cleanData]
      ).catch(err => console.error('DB insert error:', err));

      broadcastToBrowsers(sessionId, {
          type: 'terminal_output',
          sessionId,
          data: cleanData,
      });
      break;

    case 'ping':
      pool.query(
        'UPDATE sessions SET last_ping_at = NOW() WHERE id = $1',
        [sessionId]
      ).catch(err => console.error('DB update error:', err));
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'session_end':
      stopSummaryTimer(sessionId);
      clearBuffer(sessionId);

      pool.query(
        'UPDATE sessions SET status = $1, ended_at = NOW() WHERE id = $2',
        ['ended', sessionId]
      ).catch(err => console.error('DB update error:', err));

      broadcastToBrowsers(sessionId, {
        type: 'session_status',
        sessionId,
        status: 'ended',
      });
      break;

    default:
      console.warn(`[WS] Unknown message type: ${msg.type}`);
  }
}

// ─── Browser Connection ───────────────────────────────────────────────────────

function handleBrowserConnection(ws, url) {
  const token = url.searchParams.get('token');
  const sessionId = url.searchParams.get('sessionId');

  if (!token || !sessionId) {
    ws.close(4001, 'Missing token or sessionId');
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    ws.close(4001, 'Invalid token');
    return;
  }

  console.log(`[WS] Browser connected for session ${sessionId}`);

  if (!browserConnections.has(sessionId)) {
    browserConnections.set(sessionId, new Set());
  }
  browserConnections.get(sessionId).add(ws);

  const agentConnected = agentConnections.has(sessionId);
  ws.send(JSON.stringify({
    type: 'session_status',
    sessionId,
    status: agentConnected ? 'connected' : 'waiting',
  }));

  // Send recent logs from DB
  pool.query(
    'SELECT data FROM terminal_logs WHERE session_id = $1 ORDER BY created_at ASC',
    [sessionId]
  ).then(result => {
    result.rows.forEach(row => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'terminal_output',
          sessionId,
          data: row.data,
        }));
      }
    });
  }).catch(err => console.error('DB fetch error:', err));

  // Send latest AI summary if exists
  pool.query(
    'SELECT summary, created_at FROM ai_summaries WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
    [sessionId]
  ).then(result => {
    if (result.rows.length > 0 && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ai_summary',
        sessionId,
        summary: result.rows[0].summary,
        timestamp: result.rows[0].created_at,
      }));
    }
  }).catch(err => console.error('DB fetch error:', err));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'input') {
        const agentWs = agentConnections.get(sessionId);
        if (agentWs && agentWs.readyState === WebSocket.OPEN) {
          agentWs.send(JSON.stringify({ type: 'input', data: msg.data }));
        }
      }
    } catch {
      console.error('[WS] Invalid browser message');
    }
  });

  ws.on('close', () => {
    const browsers = browserConnections.get(sessionId);
    if (browsers) {
      browsers.delete(ws);
      if (browsers.size === 0) browserConnections.delete(sessionId);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Browser error:`, err.message);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function broadcastToBrowsers(sessionId, message) {
  const browsers = browserConnections.get(sessionId);
  if (!browsers) return;
  const payload = JSON.stringify(message);
  browsers.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}