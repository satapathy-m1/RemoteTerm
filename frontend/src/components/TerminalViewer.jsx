import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function TerminalViewer({ sessionId, token, onMessage }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0d0d0d',
        foreground: '#e0e0e0',
        cursor: '#4a9eff',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();
    termRef.current = term;

    const onResize = () => fitAddon.fit();
    window.addEventListener('resize', onResize);

    const wsUrl = `ws://localhost:3001/ws/browser?token=${token}&sessionId=${sessionId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'terminal_output') {
          term.write(msg.data);
        }
        // Pass ALL messages up to parent
        onMessage?.(msg);
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      onMessage?.({ type: 'session_status', status: 'disconnected' });
    };

    term.onData(data => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    return () => {
      window.removeEventListener('resize', onResize);
      ws.close();
      term.dispose();
    };
  }, [sessionId, token]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', padding: '8px', boxSizing: 'border-box' }}
    />
  );
}