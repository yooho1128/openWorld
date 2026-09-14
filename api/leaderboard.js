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
      stage_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      attempts INTEGER NOT NULL,
      distance INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  if (!sql) {
    return res.status(503).json({ error: 'Leaderboard database is not configured (DATABASE_URL missing)' });
  }

  const rawStageId = req.method === 'GET' ? req.query.stageId : req.body?.stageId;
  const stageId = clampInt(rawStageId, 1, 999);

  if (req.method === 'GET') {
    try {
      await ensureTable();
      const rows = await sql`
        SELECT name, attempts, distance
        FROM leaderboard
        WHERE stage_id = ${stageId}
        ORDER BY attempts ASC, distance DESC
        LIMIT ${MAX_RETURNED}
      `;
      return res.json({ entries: rows });
    } catch (err) {
      console.error('Leaderboard GET failed:', err);
      return res.status(502).json({ error: 'Leaderboard unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { name, attempts, distance } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const safeName = name.trim().slice(0, 8);
    const safeAttempts = clampInt(attempts, 1, 999999);
    const safeDistance = clampInt(distance, 0, 999999);

    try {
      await ensureTable();
      await sql`
        INSERT INTO leaderboard (stage_id, name, attempts, distance)
        VALUES (${stageId}, ${safeName}, ${safeAttempts}, ${safeDistance})
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
