import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

const MAX_RETURNED = 10;

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      age INTEGER NOT NULL,
      job TEXT,
      death_cause TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  if (!sql) {
    return res.status(503).json({ error: 'Leaderboard database is not configured (DATABASE_URL missing)' });
  }

  if (req.method === 'GET') {
    try {
      await ensureTable();
      const rows = await sql`
        SELECT name, score, age, job, death_cause AS "deathCause"
        FROM leaderboard
        ORDER BY score DESC
        LIMIT ${MAX_RETURNED}
      `;
      return res.json({ entries: rows });
    } catch (err) {
      console.error('Leaderboard GET failed:', err);
      return res.status(502).json({ error: 'Leaderboard unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { name, score, age, job, deathCause } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const safeName = name.trim().slice(0, 10);
    const safeScore = clampInt(score, 0, 999999);
    const safeAge = clampInt(age, 0, 999);
    const safeJob = typeof job === 'string' ? job.slice(0, 30) : null;
    const safeDeathCause = typeof deathCause === 'string' ? deathCause.slice(0, 60) : null;

    try {
      await ensureTable();
      await sql`
        INSERT INTO leaderboard (name, score, age, job, death_cause)
        VALUES (${safeName}, ${safeScore}, ${safeAge}, ${safeJob}, ${safeDeathCause})
      `;
      return res.json({ ok: true });
    } catch (err) {
      console.error('Leaderboard POST failed:', err);
      return res.status(502).json({ error: 'Failed to save score' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
