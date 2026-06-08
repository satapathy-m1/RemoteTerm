import 'dotenv/config';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import http from 'http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import { setupWebSocketServer } from './ws/wsServer.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server and attach WebSocket to it
const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});