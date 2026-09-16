import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = connectionString ? neon(connectionString) : null;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      nickname TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

function safeNickname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 20);
  return trimmed || null;
}

export default async function handler(req, res) {
  if (!sql) {
    return res.status(503).json({ error: 'Save database is not configured (DATABASE_URL missing)' });
  }

  if (req.method === 'GET') {
    const nickname = safeNickname(req.query.nickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });

    try {
      await ensureTable();
      const rows = await sql`SELECT data FROM characters WHERE nickname = ${nickname}`;
      if (!rows.length) return res.status(404).json({ error: 'not_found' });
      return res.json({ character: rows[0].data });
    } catch (err) {
      console.error('Character GET failed:', err);
      return res.status(502).json({ error: 'Save unavailable' });
    }
  }

  if (req.method === 'POST') {
    const { nickname: rawNickname, character } = req.body ?? {};
    const nickname = safeNickname(rawNickname);
    if (!nickname) return res.status(400).json({ error: 'nickname is required' });
    if (!character || typeof character !== 'object') {
      return res.status(400).json({ error: 'character is required' });
    }

    try {
      await ensureTable();
      await sql`
        INSERT INTO characters (nickname, data, updated_at)
        VALUES (${nickname}, ${JSON.stringify(character)}, now())
        ON CONFLICT (nickname) DO UPDATE SET data = excluded.data, updated_at = now()
      `;
      return res.json({ ok: true });
    } catch (err) {
      console.error('Character POST failed:', err);
      return res.status(502).json({ error: 'Failed to save character' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
