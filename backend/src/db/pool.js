import pg from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.connect()
  .then(client => {
    console.log('DB connected successfully');
    client.release();
  })
  .catch(err => console.error('DB connection failed:', err.message));

export default pool;