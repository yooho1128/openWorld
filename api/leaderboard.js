import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;
const MAX_RETURNED = 50;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!sql) {
    return res.status(503).json({ error: 'Leaderboard database is not configured (DATABASE_URL missing)' });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS characters (
        nickname TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    // 마스터(운영자) 계정은 랭킹 산정에서 제외한다.
    const rows = await sql`
      SELECT nickname, data
      FROM characters
      WHERE data->>'version' = 'rpg-1' AND COALESCE((data->>'isAdmin')::boolean, false) = false
      ORDER BY (data->>'level')::int DESC NULLS LAST, (data->>'victories')::int DESC NULLS LAST
      LIMIT ${MAX_RETURNED}
    `;
    const ranking = rows.map((row) => ({
      nickname: row.nickname,
      name: row.data.name ?? row.nickname,
      classId: row.data.classId ?? null,
      advancementId: row.data.advancementId ?? null,
      level: Number(row.data.level) || 1,
      victories: Number(row.data.victories) || 0,
      defeats: Number(row.data.defeats) || 0,
      gold: Number(row.data.gold) || 0,
    }));
    return res.json({ ranking });
  } catch (err) {
    console.error('Leaderboard GET failed:', err);
    return res.status(502).json({ error: 'Leaderboard unavailable' });
  }
}
