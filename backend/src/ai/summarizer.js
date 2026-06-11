import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../db/pool.js';

// Initialize the client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a supported production model identifier
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Strip ANSI escape codes before sending to Gemini
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[mGKHF]/g, '').replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

export async function summarizeSession(sessionId, lines) {
  if (!lines || lines.length === 0) return null;

  const plainText = stripAnsi(lines.join('\n'));

  const prompt = `You are a terminal monitoring assistant. Summarize the following terminal output in 2-3 sentences: what process is running, current status, any errors or warnings, and overall progress. Be concise and technical.

Here is the latest terminal output:
<terminal_output>
${plainText}
</terminal_output>`;

  try {
    const result = await model.generateContent(prompt);
    
    // Ensure response text is extracted properly
    const response = await result.response;
    const summary = response.text();

    if (!summary) {
      console.warn(`[AI] Warning: Empty response generated for session ${sessionId}`);
      return null;
    }

    // Save to DB
    await pool.query(
      'INSERT INTO ai_summaries (session_id, summary, lines_summarized) VALUES ($1, $2, $3)',
      [sessionId, summary, lines.length]
    );

    console.log(`[AI] Summary generated for session ${sessionId}`);
    return summary;
  } catch (err) {
    console.error('[AI] Gemini error:', err.message);
    return null;
  }
}