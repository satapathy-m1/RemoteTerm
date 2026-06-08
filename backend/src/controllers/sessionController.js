import pool from '../db/pool.js';
import jwt from 'jsonwebtoken';

function generateCode() {
  const words = ['KITE', 'FOX', 'BOLT', 'WAVE', 'PINE', 'REED', 'HAWK', 'DUSK', 'MINT', 'COAL'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
}

export async function generateSessionCode(req, res) {
  try {
    const userId = req.user.userId;

    // Clean up any expired unused codes for this user
    await pool.query(
      'DELETE FROM connection_codes WHERE user_id = $1 AND expires_at < NOW()',
      [userId]
    );

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await pool.query(
      'INSERT INTO connection_codes (code, user_id, expires_at) VALUES ($1, $2, $3)',
      [code, userId, expiresAt]
    );

    res.json({ code, expiresAt });
  } catch (err) {
    console.error('Generate code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function verifySessionCode(req, res) {
  const { code, machineName } = req.body;

  if (!code) return res.status(400).json({ error: 'Code is required' });

  try {
    const result = await pool.query(
      'SELECT * FROM connection_codes WHERE code = $1',
      [code]
    );
    const record = result.rows[0];

    if (!record) return res.status(404).json({ error: 'Invalid code' });
    if (record.used) return res.status(400).json({ error: 'Code already used' });
    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Code expired' });
    }

    // Mark code as used
    await pool.query(
      'UPDATE connection_codes SET used = TRUE WHERE id = $1',
      [record.id]
    );

    // Generate a temporary unique placeholder using the code itself
    const tempToken = `tmp-${record.id}`;

    // Create session row with temp token first
    const sessionResult = await pool.query(
      'INSERT INTO sessions (user_id, session_token, machine_name) VALUES ($1, $2, $3) RETURNING id',
      [record.user_id, tempToken, machineName || null]
    );
    const sessionId = sessionResult.rows[0].id;

    // Generate real session JWT
    const sessionToken = jwt.sign(
      { sessionId, userId: record.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Update with real token
    await pool.query(
      'UPDATE sessions SET session_token = $1 WHERE id = $2',
      [sessionToken, sessionId]
    );

    res.json({ sessionToken, sessionId });
  } catch (err) {
    console.error('Verify code error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSessions(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, status, machine_name, started_at, ended_at FROM sessions WHERE user_id = $1 ORDER BY started_at DESC',
      [req.user.userId]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}