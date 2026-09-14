import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const MAX_STORED = 200;
const MAX_RETURNED = 10;

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export default async function handler(req, res) {
  const rawStageId = req.method === 'GET' ? req.query.stageId : req.body?.stageId;
  const stageId = clampInt(rawStageId, 1, 999);
  const key = `leaderboard:stage:${stageId}`;

  if (req.method === 'GET') {
    try {
      const raw = await redis.lrange(key, 0, MAX_STORED - 1);
      // The Upstash client auto-deserializes JSON-looking strings, so entries
      // may already be objects here rather than the raw strings we stored.
      const entries = raw
        .map((s) => {
          if (typeof s === 'string') {
            try {
              return JSON.parse(s);
            } catch {
              return null;
            }
          }
          return s && typeof s === 'object' ? s : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.attempts - b.attempts || b.distance - a.distance)
        .slice(0, MAX_RETURNED);
      return res.json({ entries });
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

    const entry = {
      name: name.trim().slice(0, 8),
      attempts: clampInt(attempts, 1, 999999),
      distance: clampInt(distance, 0, 999999),
      at: Date.now(),
    };

    try {
      await redis.lpush(key, JSON.stringify(entry));
      await redis.ltrim(key, 0, MAX_STORED - 1);
      return res.json({ ok: true });
    } catch (err) {
      console.error('Leaderboard POST failed:', err);
      return res.status(502).json({ error: 'Failed to save score' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
